import type { LogEntry, LogLevel, LogCategory, LogFilter } from '@/types'

/**
 * 默认日志最大数量（减少以提升性能）
 */
export const DEFAULT_LOG_MAX_SIZE = 500

/**
 * 日志级别优先级（用于过滤）
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  info: 0,
  warning: 1,
  error: 2,
}

/**
 * 最小日志级别（低于此级别的日志不记录）
 * 可通过环境变量配置：info | warning | error
 */
export const MIN_LOG_LEVEL: LogLevel = 'info'

/**
 * 检查日志级别是否应该被记录
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel = MIN_LOG_LEVEL): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel]
}

/**
 * 生成唯一 ID
 */
export function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 创建日志条目
 */
export function createLogEntry(
  level: LogLevel,
  category: LogCategory,
  message: string,
  details?: Record<string, unknown>
): LogEntry {
  return {
    id: generateLogId(),
    timestamp: new Date(),
    level,
    category,
    message,
    details,
  }
}

/**
 * 添加日志到列表（循环存储）
 * 当日志数量达到上限时，删除最旧的日志
 * 
 * @param logs 当前日志列表
 * @param newLog 新日志条目
 * @param maxSize 最大日志数量
 * @returns 更新后的日志列表
 */
export function addLog(
  logs: LogEntry[],
  newLog: LogEntry,
  maxSize: number = DEFAULT_LOG_MAX_SIZE
): LogEntry[] {
  const newLogs = [newLog, ...logs]
  
  // 如果超过最大数量，删除最旧的日志
  if (newLogs.length > maxSize) {
    return newLogs.slice(0, maxSize)
  }
  
  return newLogs
}

/**
 * 清空日志
 * @returns 空日志列表
 */
export function clearLogs(): LogEntry[] {
  return []
}

/**
 * 按时间倒序排列日志（最新的在前）
 * 
 * @param logs 日志列表
 * @returns 排序后的日志列表
 */
export function sortLogsByTime(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
    const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
    return timeB - timeA
  })
}

/**
 * 筛选日志
 * 
 * @param logs 日志列表
 * @param filter 筛选条件
 * @returns 筛选后的日志列表
 */
export function filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  return logs.filter((log) => {
    // 按级别筛选
    if (filter.level && log.level !== filter.level) {
      return false
    }
    
    // 按分类筛选
    if (filter.category && log.category !== filter.category) {
      return false
    }
    
    // 按时间范围筛选
    const logTime = log.timestamp instanceof Date 
      ? log.timestamp.getTime() 
      : new Date(log.timestamp).getTime()
    
    if (filter.startTime) {
      const startTime = filter.startTime instanceof Date 
        ? filter.startTime.getTime() 
        : new Date(filter.startTime).getTime()
      if (logTime < startTime) {
        return false
      }
    }
    
    if (filter.endTime) {
      const endTime = filter.endTime instanceof Date 
        ? filter.endTime.getTime() 
        : new Date(filter.endTime).getTime()
      if (logTime > endTime) {
        return false
      }
    }
    
    return true
  })
}

/**
 * 检查日志列表是否按时间倒序排列
 * 
 * @param logs 日志列表
 * @returns 是否按时间倒序排列
 */
export function isLogsSortedDescending(logs: LogEntry[]): boolean {
  for (let i = 0; i < logs.length - 1; i++) {
    const timeA = logs[i].timestamp instanceof Date 
      ? logs[i].timestamp.getTime() 
      : new Date(logs[i].timestamp).getTime()
    const timeB = logs[i + 1].timestamp instanceof Date 
      ? logs[i + 1].timestamp.getTime() 
      : new Date(logs[i + 1].timestamp).getTime()
    
    if (timeA < timeB) {
      return false
    }
  }
  return true
}
