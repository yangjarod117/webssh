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
 * 已保存的连接配置（不包含密码）
 */
export interface SavedConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  createdAt: Date
  lastUsedAt: Date
}

/**
 * 会话状态
 */
export type SessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * SSH 会话状态
 */
export interface SessionState {
  id: string
  config: Omit<ConnectionConfig, 'password' | 'privateKey'>
  status: SessionStatus
  error?: string
}
