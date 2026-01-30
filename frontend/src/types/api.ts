import type { FileItem } from './file'
import type { SessionState } from './connection'

/**
 * API 错误响应
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * 创建会话请求
 */
export interface CreateSessionRequest {
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
}

/**
 * 创建会话响应
 */
export interface CreateSessionResponse {
  sessionId: string
  status: SessionState['status']
}

/**
 * 文件列表响应
 */
export interface ListFilesResponse {
  path: string
  files: FileItem[]
}

/**
 * 文件内容响应
 */
export interface FileContentResponse {
  path: string
  content: string
  size: number
}

/**
 * 文件操作请求
 */
export interface FileOperationRequest {
  path: string
  newPath?: string // 用于重命名/移动
  type?: 'file' | 'directory' // 用于创建
}
