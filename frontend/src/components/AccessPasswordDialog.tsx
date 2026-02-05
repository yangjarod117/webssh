import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AccessPasswordDialogProps {
  isOpen: boolean
  onVerify: (password: string, remember: boolean) => Promise<boolean>
  isLight: boolean
}

// 密码哈希函数（使用 SHA-256）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function AccessPasswordDialog({ isOpen, onVerify, isLight }: AccessPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true) // 默认勾选记住密码
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 清除错误
  useEffect(() => {
    if (password) setError(null)
  }, [password])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('请输入访问密码')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await onVerify(password, remember)
      if (!success) {
        setError('密码错误')
        setPassword('')
      }
    } catch {
      setError('验证失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [password, remember, onVerify])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        style={{
          background: isLight
            ? 'linear-gradient(135deg, rgba(240, 244, 248, 0.95) 0%, rgba(226, 232, 240, 0.95) 50%, rgba(240, 244, 248, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(10, 14, 23, 0.98) 0%, rgba(26, 26, 46, 0.98) 50%, rgba(13, 19, 33, 0.98) 100%)',
        }}
      >
        {/* 背景装饰 */}
        <motion.div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.12) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* 密码框 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md mx-4 p-8 rounded-2xl backdrop-blur-xl"
          style={{
            background: isLight
              ? 'rgba(255, 255, 255, 0.7)'
              : 'rgba(17, 24, 39, 0.6)',
            border: `1px solid ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 212, 255, 0.2)'}`,
            boxShadow: isLight
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 212, 255, 0.1)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4"
              style={{ boxShadow: '0 8px 30px rgba(0, 212, 255, 0.4)' }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text">Flassh</h1>
            <p className="text-sm text-text-secondary mt-1">请输入访问密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 密码输入框 */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="访问密码"
                autoFocus
                className="w-full px-4 py-3 pr-12 rounded-xl text-text placeholder:text-text-muted transition-all duration-200 focus:outline-none"
                style={{
                  background: isLight ? 'rgba(241, 245, 249, 0.8)' : 'rgba(30, 41, 59, 0.6)',
                  border: `1px solid ${error ? 'var(--color-error)' : isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 212, 255, 0.2)'}`,
                  boxShadow: error
                    ? '0 0 0 3px rgba(255, 71, 87, 0.15)'
                    : 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-primary)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 212, 255, 0.15), 0 0 20px rgba(0, 212, 255, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? 'var(--color-error)' : isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 212, 255, 0.2)'
                  e.target.style.boxShadow = error ? '0 0 0 3px rgba(255, 71, 87, 0.15)' : 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-error text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 记住密码 */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${
                  remember
                    ? 'bg-primary'
                    : isLight
                    ? 'bg-gray-200 border border-gray-300'
                    : 'bg-slate-700 border border-slate-600'
                }`}
                onClick={() => setRemember(!remember)}
                style={{
                  boxShadow: remember ? '0 0 10px rgba(0, 212, 255, 0.4)' : 'none',
                }}
              >
                {remember && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-text-secondary">记住密码（7天内免登录）</span>
            </label>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #0099cc 100%)',
                boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 212, 255, 0.5), 0 0 30px rgba(0, 212, 255, 0.2)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 212, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  验证中...
                </span>
              ) : (
                '进入系统'
              )}
            </button>
          </form>

          {/* 安全提示 */}
          <p className="text-xs text-text-muted text-center mt-6">
            🔒 密码经过加密传输，不会明文存储
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// 导出工具函数
export { hashPassword }
