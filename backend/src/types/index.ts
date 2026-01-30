import type { Client, SFTPWrapper, ClientChannel } from 'ssh2'

/**
 * SSH 连接配置
 */
export interface ConnectionConfig {
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKey?: string
  passphrase?: string
}

/**
 * SSH 会话
 */
export interface SSHSession {
  id: string
  connection: Client
  sftp?: SFTPWrapper
  shell?: ClientChannel
  config: Omit<ConnectionConfig, 'password' | 'privateKey'>
  createdAt: Date
  lastActivityAt: Date
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  error?: string
}

/**
 * 文件信息
 */
export interface FileStats {
  name: string
  path: string
  type: 'file' | 'directory' | 'symlink'
  size: number
  mode: number
  uid: number
  gid: number
  atime: Date
  mtime: Date
}

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
  passphrase?: string
}

/**
 * 创建会话响应
 */
export interface CreateSessionResponse {
  sessionId: string
  status: SSHSession['status']
}

/**
 * WebSocket 客户端消息
 */
export interface ClientMessage {
  type: 'input' | 'resize' | 'ping'
  sessionId: string
  data?: string
  cols?: number
  rows?: number
}

/**
 * WebSocket 服务端消息
 */
export interface ServerMessage {
  type: 'output' | 'error' | 'disconnect' | 'pong'
  sessionId: string
  data?: string
  error?: string
}
