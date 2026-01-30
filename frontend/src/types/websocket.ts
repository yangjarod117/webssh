/**
 * 客户端消息类型
 */
export type ClientMessageType = 'input' | 'resize' | 'ping'

/**
 * 客户端发送的消息
 */
export interface ClientMessage {
  type: ClientMessageType
  sessionId: string
  data?: string
  cols?: number
  rows?: number
}

/**
 * 服务端消息类型
 */
export type ServerMessageType = 'output' | 'error' | 'disconnect' | 'pong'

/**
 * 服务端发送的消息
 */
export interface ServerMessage {
  type: ServerMessageType
  sessionId: string
  data?: string
  error?: string
}
