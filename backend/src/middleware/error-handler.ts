import { Request, Response, NextFunction } from 'express'
import type { ApiError } from '../types/index.js'

/**
 * 错误代码映射
 */
const errorCodeMap: Record<string, { code: string; status: number }> = {
  ECONNREFUSED: { code: 'CONNECTION_REFUSED', status: 503 },
  ENOTFOUND: { code: 'HOST_NOT_FOUND', status: 503 },
  ETIMEDOUT: { code: 'CONNECTION_TIMEOUT', status: 504 },
  'CONNECTION TIMEOUT': { code: 'CONNECTION_TIMEOUT', status: 504 },
  'NO RESPONSE': { code: 'CONNECTION_TIMEOUT', status: 504 },
  ENOENT: { code: 'FILE_NOT_FOUND', status: 404 },
  EACCES: { code: 'PERMISSION_DENIED', status: 403 },
  EEXIST: { code: 'FILE_EXISTS', status: 409 },
  ENOSPC: { code: 'DISK_FULL', status: 507 },
  AUTHENTICATION_FAILED: { code: 'AUTH_FAILED', status: 401 },
  'CANNOT PARSE': { code: 'INVALID_KEY', status: 400 },
  'UNSUPPORTED KEY': { code: 'INVALID_KEY', status: 400 },
}

/**
 * 解析错误代码
 */
function parseErrorCode(err: Error): { code: string; status: number } {
  const message = err.message.toUpperCase()
  
  for (const [key, value] of Object.entries(errorCodeMap)) {
    if (message.includes(key)) {
      return value
    }
  }
  
  // 检查 SSH 认证错误
  if (message.includes('AUTH') || message.includes('AUTHENTICATION')) {
    return { code: 'AUTH_FAILED', status: 401 }
  }
  
  return { code: 'INTERNAL_ERROR', status: 500 }
}

/**
 * 错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message)
  
  const { code, status } = parseErrorCode(err)
  
  const response: ApiError = {
    code,
    message: getErrorMessage(code, err.message),
  }
  
  res.status(status).json(response)
}

/**
 * 获取用户友好的错误消息
 */
function getErrorMessage(code: string, originalMessage: string): string {
  const messages: Record<string, string> = {
    CONNECTION_REFUSED: '连接被拒绝，请检查服务器地址和端口',
    HOST_NOT_FOUND: '无法找到主机，请检查服务器地址',
    CONNECTION_TIMEOUT: '连接超时，请检查网络连接',
    FILE_NOT_FOUND: '文件或目录不存在',
    PERMISSION_DENIED: '权限不足，无法执行此操作',
    FILE_EXISTS: '文件或目录已存在',
    DISK_FULL: '磁盘空间不足',
    AUTH_FAILED: '认证失败，请检查用户名和密码',
    INVALID_KEY: '私钥格式无效，请检查私钥内容',
    INTERNAL_ERROR: '服务器内部错误',
  }
  
  return messages[code] || originalMessage || '发生未知错误'
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(_req: Request, res: Response): void {
  const response: ApiError = {
    code: 'NOT_FOUND',
    message: '请求的资源不存在',
  }
  res.status(404).json(response)
}
