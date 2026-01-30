import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { LogEntry, LogLevel, LogCategory, LogFilter } from '../../types'
import {
  addLog,
  sortLogsByTime,
  filterLogs,
  isLogsSortedDescending,
  DEFAULT_LOG_MAX_SIZE,
} from '../logs'

// 日志级别和分类的生成器
const logLevelArb = fc.constantFrom<LogLevel>('info', 'warning', 'error')
const logCategoryArb = fc.constantFrom<LogCategory>('connection', 'file', 'system', 'error')

// 日志条目生成器
const logEntryArb: fc.Arbitrary<LogEntry> = fc.record({
  id: fc.uuid(),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  level: logLevelArb,
  category: logCategoryArb,
  message: fc.string({ minLength: 1, maxLength: 200 }),
  details: fc.option(fc.dictionary(fc.string(), fc.jsonValue()), { nil: undefined }),
})

// 日志列表生成器
const logListArb: fc.Arbitrary<LogEntry[]> = fc.array(logEntryArb, { minLength: 0, maxLength: 50 })

/**
 * **Feature: web-ssh-terminal, Property 19: 日志循环存储正确性**
 * **Validates: Requirements 12.4**
 * 
 * *For any* 日志列表和新日志条目，当日志数量达到上限时，
 * 添加新日志后最旧的日志应该被删除，且日志总数不超过上限。
 */
describe('Property 19: 日志循环存储正确性', () => {
  it('should not exceed max size after adding logs', () => {
    fc.assert(
      fc.property(
        logListArb,
        logEntryArb,
        fc.integer({ min: 1, max: 100 }),
        (logs: LogEntry[], newLog: LogEntry, maxSize: number) => {
          const result = addLog(logs, newLog, maxSize)
          
          // 日志数量不应超过上限
          expect(result.length).toBeLessThanOrEqual(maxSize)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should add new log at the beginning', () => {
    fc.assert(
      fc.property(
        logListArb,
        logEntryArb,
        (logs: LogEntry[], newLog: LogEntry) => {
          const result = addLog(logs, newLog, DEFAULT_LOG_MAX_SIZE)
          
          // 新日志应该在列表开头
          expect(result[0]).toEqual(newLog)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should remove oldest logs when exceeding max size', () => {
    fc.assert(
      fc.property(
        fc.array(logEntryArb, { minLength: 5, maxLength: 20 }),
        logEntryArb,
        (logs: LogEntry[], newLog: LogEntry) => {
          const maxSize = 5
          const result = addLog(logs, newLog, maxSize)
          
          // 结果长度应该等于 maxSize（如果原列表 + 1 > maxSize）
          if (logs.length >= maxSize) {
            expect(result.length).toBe(maxSize)
          } else {
            expect(result.length).toBe(logs.length + 1)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 20: 日志排序正确性**
 * **Validates: Requirements 12.5**
 * 
 * *For any* 日志列表，日志应该按时间戳倒序排列（最新的在前）。
 */
describe('Property 20: 日志排序正确性', () => {
  it('should sort logs in descending order by timestamp', () => {
    fc.assert(
      fc.property(logListArb, (logs: LogEntry[]) => {
        const sorted = sortLogsByTime(logs)
        
        // 排序后应该是倒序的
        expect(isLogsSortedDescending(sorted)).toBe(true)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should preserve all logs after sorting', () => {
    fc.assert(
      fc.property(logListArb, (logs: LogEntry[]) => {
        const sorted = sortLogsByTime(logs)
        
        // 排序后数量应该相同
        expect(sorted.length).toBe(logs.length)
        
        // 所有原始日志都应该存在
        const sortedIds = new Set(sorted.map((l: LogEntry) => l.id))
        logs.forEach((log: LogEntry) => {
          expect(sortedIds.has(log.id)).toBe(true)
        })
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 21: 日志筛选正确性**
 * **Validates: Requirements 12.6**
 * 
 * *For any* 日志列表和筛选条件，筛选结果应该只包含符合条件的日志条目。
 */
describe('Property 21: 日志筛选正确性', () => {
  it('should filter logs by level correctly', () => {
    fc.assert(
      fc.property(logListArb, logLevelArb, (logs: LogEntry[], level: LogLevel) => {
        const filter: LogFilter = { level }
        const filtered = filterLogs(logs, filter)
        
        // 所有筛选结果都应该匹配指定级别
        filtered.forEach((log: LogEntry) => {
          expect(log.level).toBe(level)
        })
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should filter logs by category correctly', () => {
    fc.assert(
      fc.property(logListArb, logCategoryArb, (logs: LogEntry[], category: LogCategory) => {
        const filter: LogFilter = { category }
        const filtered = filterLogs(logs, filter)
        
        // 所有筛选结果都应该匹配指定分类
        filtered.forEach((log: LogEntry) => {
          expect(log.category).toBe(category)
        })
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should filter logs by time range correctly', () => {
    fc.assert(
      fc.property(
        logListArb,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
        fc.date({ min: new Date('2025-01-02'), max: new Date('2030-01-01') }),
        (logs: LogEntry[], startTime: Date, endTime: Date) => {
          const filter: LogFilter = { startTime, endTime }
          const filtered = filterLogs(logs, filter)
          
          // 所有筛选结果都应该在时间范围内
          filtered.forEach((log: LogEntry) => {
            const logTime = log.timestamp instanceof Date 
              ? log.timestamp.getTime() 
              : new Date(log.timestamp).getTime()
            expect(logTime).toBeGreaterThanOrEqual(startTime.getTime())
            expect(logTime).toBeLessThanOrEqual(endTime.getTime())
          })
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return subset of original logs', () => {
    fc.assert(
      fc.property(
        logListArb,
        fc.record({
          level: fc.option(logLevelArb, { nil: undefined }),
          category: fc.option(logCategoryArb, { nil: undefined }),
        }),
        (logs: LogEntry[], filter: LogFilter) => {
          const filtered = filterLogs(logs, filter)
          
          // 筛选结果数量不应超过原始数量
          expect(filtered.length).toBeLessThanOrEqual(logs.length)
          
          // 所有筛选结果都应该来自原始列表
          const originalIds = new Set(logs.map((l: LogEntry) => l.id))
          filtered.forEach((log: LogEntry) => {
            expect(originalIds.has(log.id)).toBe(true)
          })
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
