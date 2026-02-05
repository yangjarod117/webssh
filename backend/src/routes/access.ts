import { Router } from 'express'
import crypto from 'crypto'

const router = Router()

// 访问密码配置（从环境变量读取，默认为空表示不需要密码）
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || ''

// 生成 token 的密钥（每次重启会变，token 失效需重新登录）
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex')

// Token 有效期（7天）
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60

// Cookie 名称
const COOKIE_NAME = 'flassh_access'

/**
 * 生成访问 token
 */
function generateToken(expiresAt: number): string {
  const payload = JSON.stringify({ exp: expiresAt })
  const hmac = crypto.createHmac('sha256', TOKEN_SECRET)
  hmac.update(payload)
  const signature = hmac.digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + signature
}

/**
 * 验证 token
 */
function verifyToken(token: string): boolean {
  try {
    const [payloadB64, signature] = token.split('.')
    if (!payloadB64 || !signature) return false
    
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const hmac = crypto.createHmac('sha256', TOKEN_SECRET)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex')
    
    if (signature !== expectedSignature) return false
    
    const { exp } = JSON.parse(payload)
    return Date.now() < exp
  } catch {
    return false
  }
}

/**
 * 哈希密码（与前端一致使用 SHA-256）
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// 检查是否需要访问密码（同时检查 cookie）
router.get('/check', (req, res) => {
  // 如果没有设置访问密码，不需要验证
  if (!ACCESS_PASSWORD) {
    return res.json({ required: false, verified: true })
  }
  
  // 检查 cookie 中的 token
  const token = req.cookies?.[COOKIE_NAME]
  if (token && verifyToken(token)) {
    return res.json({ required: true, verified: true })
  }
  
  res.json({ required: true, verified: false })
})

// 验证密码
router.post('/verify', (req, res) => {
  const { password, remember } = req.body

  // 如果没有设置访问密码，直接通过
  if (!ACCESS_PASSWORD) {
    return res.json({ success: true })
  }

  // 验证密码（前端发送的是哈希后的密码）
  const hashedInput = typeof password === 'string' && password.length === 64 
    ? password  // 已经是哈希值
    : hashPassword(password || '')
  
  const hashedPassword = hashPassword(ACCESS_PASSWORD)

  if (hashedInput === hashedPassword) {
    // 如果选择记住密码，设置 httpOnly cookie
    if (remember) {
      const expiresAt = Date.now() + TOKEN_EXPIRY_MS
      const token = generateToken(expiresAt)
      
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,      // 防止 XSS 攻击读取
        secure: process.env.NODE_ENV === 'production', // 生产环境要求 HTTPS
        sameSite: 'lax',     // 防止 CSRF
        maxAge: TOKEN_EXPIRY_SECONDS * 1000,
        path: '/',
      })
    }
    
    return res.json({ success: true })
  }

  res.status(401).json({ success: false, message: '密码错误' })
})

// 登出（清除 cookie）
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ success: true })
})

export default router
