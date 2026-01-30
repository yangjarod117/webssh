import { Router, Request, Response, NextFunction } from 'express'
import { credentialStore } from '../services/credential-store.js'
import type { ApiError } from '../types/index.js'

const router = Router()

/**
 * 保存凭据
 * POST /api/credentials
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, host, port, username, authType, password, privateKey, passphrase } = req.body

    if (!id || !host || !port || !username || !authType) {
      const error: ApiError = {
        code: 'INVALID_REQUEST',
        message: '缺少必填字段',
      }
      return res.status(400).json(error)
    }

    credentialStore.save(id, {
      host,
      port,
      username,
      authType,
      password,
      privateKey,
      passphrase,
    })

    res.status(201).json({ success: true, id })
  } catch (err) {
    next(err)
  }
})

/**
 * 获取凭据（用于快速连接）
 * GET /api/credentials/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const credential = credentialStore.get(id)

  if (!credential) {
    const error: ApiError = {
      code: 'CREDENTIAL_NOT_FOUND',
      message: '凭据不存在',
    }
    return res.status(404).json(error)
  }

  res.json(credential)
})

/**
 * 检查凭据是否存在
 * GET /api/credentials/:id/exists
 */
router.get('/:id/exists', (req: Request, res: Response) => {
  const { id } = req.params
  const exists = credentialStore.has(id)
  res.json({ exists })
})

/**
 * 删除凭据
 * DELETE /api/credentials/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const success = credentialStore.delete(id)

  if (!success) {
    const error: ApiError = {
      code: 'CREDENTIAL_NOT_FOUND',
      message: '凭据不存在',
    }
    return res.status(404).json(error)
  }

  res.status(204).send()
})

/**
 * 列出所有已保存的凭据（不含敏感信息）
 * GET /api/credentials
 */
router.get('/', (_req: Request, res: Response) => {
  const list = credentialStore.list()
  res.json({ credentials: list })
})

export default router
