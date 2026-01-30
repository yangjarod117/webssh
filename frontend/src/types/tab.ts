/**
 * 标签页
 */
export interface Tab {
  id: string
  name: string
  sessionId: string
  isConnected: boolean
}

/**
 * 标签页重排参数
 */
export interface TabReorderParams {
  fromIndex: number
  toIndex: number
}
