/**
 * 日志级别
 */
export type LogLevel = 'info' | 'warning' | 'error'

/**
 * 日志分类
 */
export type LogCategory = 'connection' | 'file' | 'system' | 'error'

/**
 * 日志条目
 */
export interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  category: LogCategory
  message: string
  details?: Record<string, unknown>
}

/**
 * 日志筛选条件
 */
export interface LogFilter {
  level?: LogLevel
  category?: LogCategory
  startTime?: Date
  endTime?: Date
}
