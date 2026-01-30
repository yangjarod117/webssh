import { useState, useMemo } from 'react'
import type { LogEntry, LogLevel, LogFilter } from '@/types'
import { filterLogs, sortLogsByTime } from '@/utils/logs'
import { ConfirmDialog } from './Dialog'

/**
 * 日志面板属性
 */
export interface LogPanelProps {
  logs: LogEntry[]
  onClear: () => void
  onFilter?: (filter: LogFilter) => void
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n: number) => n.toString().padStart(2, '0')
  
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * 获取日志级别图标
 */
export function getLogLevelIcon(level: LogLevel): React.ReactNode {
  switch (level) {
    case 'info':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'warning':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    case 'error':
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
  }
}

/**
 * 获取日志级别颜色类名
 */
export function getLogLevelColorClass(level: LogLevel): string {
  switch (level) {
    case 'info':
      return 'text-primary'
    case 'warning':
      return 'text-yellow-500'
    case 'error':
      return 'text-error'
  }
}

/**
 * 获取日志分类标签
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    connection: '连接',
    file: '文件',
    system: '系统',
    error: '错误',
  }
  return labels[category] || category
}

/**
 * 日志条目组件
 */
function LogItem({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = log.details && Object.keys(log.details).length > 0

  return (
    <div
      className={`
        px-3 py-2 border-b border-border/50 hover:bg-surface/50
        transition-colors duration-150 cursor-pointer
      `}
      onClick={() => hasDetails && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        {/* 日志级别图标 */}
        <span className={`flex-shrink-0 mt-0.5 ${getLogLevelColorClass(log.level)}`}>
          {getLogLevelIcon(log.level)}
        </span>

        {/* 日志内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-secondary mb-1">
            <span>{formatTimestamp(log.timestamp)}</span>
            <span className="px-1.5 py-0.5 rounded bg-surface text-xs">
              {getCategoryLabel(log.category)}
            </span>
          </div>
          <p className="text-sm text-white break-words">{log.message}</p>
          
          {/* 详情展开 */}
          {hasDetails && expanded && (
            <pre className="mt-2 p-2 rounded bg-background text-xs text-secondary overflow-x-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>

        {/* 展开指示器 */}
        {hasDetails && (
          <span className={`flex-shrink-0 text-secondary transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  )
}


/**
 * 日志筛选栏组件
 */
interface LogFilterBarProps {
  filter: LogFilter
  onFilterChange: (filter: LogFilter) => void
  onClear: () => void
  logCount: number
  filteredCount: number
}

function LogFilterBar({ filter, onFilterChange, onClear, logCount, filteredCount }: LogFilterBarProps) {
  const levels: Array<{ value: LogLevel | undefined; label: string }> = [
    { value: undefined, label: '全部级别' },
    { value: 'info', label: '信息' },
    { value: 'warning', label: '警告' },
    { value: 'error', label: '错误' },
  ]

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-surface/50">
      {/* 级别筛选 */}
      <select
        value={filter.level || ''}
        onChange={(e) => onFilterChange({ ...filter, level: e.target.value as LogLevel || undefined })}
        className="
          px-2 py-1 rounded text-sm
          bg-background border border-border text-white
          focus:outline-none focus:ring-2 focus:ring-primary/50
        "
      >
        {levels.map((level) => (
          <option key={level.label} value={level.value || ''}>
            {level.label}
          </option>
        ))}
      </select>

      {/* 时间范围筛选 - 开始时间 */}
      <input
        type="datetime-local"
        value={filter.startTime ? formatDateTimeLocal(filter.startTime) : ''}
        onChange={(e) => onFilterChange({ 
          ...filter, 
          startTime: e.target.value ? new Date(e.target.value) : undefined 
        })}
        className="
          px-2 py-1 rounded text-sm
          bg-background border border-border text-white
          focus:outline-none focus:ring-2 focus:ring-primary/50
        "
        placeholder="开始时间"
      />

      <span className="text-secondary text-sm">至</span>

      {/* 时间范围筛选 - 结束时间 */}
      <input
        type="datetime-local"
        value={filter.endTime ? formatDateTimeLocal(filter.endTime) : ''}
        onChange={(e) => onFilterChange({ 
          ...filter, 
          endTime: e.target.value ? new Date(e.target.value) : undefined 
        })}
        className="
          px-2 py-1 rounded text-sm
          bg-background border border-border text-white
          focus:outline-none focus:ring-2 focus:ring-primary/50
        "
        placeholder="结束时间"
      />

      {/* 重置筛选 */}
      {(filter.level || filter.startTime || filter.endTime) && (
        <button
          onClick={() => onFilterChange({})}
          className="
            px-2 py-1 rounded text-sm
            text-secondary hover:text-white hover:bg-surface
            transition-colors duration-150
          "
        >
          重置
        </button>
      )}

      {/* 间隔 */}
      <div className="flex-1" />

      {/* 日志计数 */}
      <span className="text-xs text-secondary">
        {filteredCount === logCount 
          ? `共 ${logCount} 条` 
          : `${filteredCount} / ${logCount} 条`
        }
      </span>

      {/* 清空按钮 */}
      <button
        onClick={onClear}
        disabled={logCount === 0}
        className="
          px-2 py-1 rounded text-sm
          text-error hover:bg-error/10
          transition-colors duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        清空
      </button>
    </div>
  )
}

/**
 * 格式化日期为 datetime-local 输入格式
 */
function formatDateTimeLocal(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  const pad = (n: number) => n.toString().padStart(2, '0')
  
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 日志面板组件
 */
export function LogPanel({ logs, onClear, onFilter }: LogPanelProps) {
  const [filter, setFilter] = useState<LogFilter>({})
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // 排序并筛选日志
  const sortedLogs = useMemo(() => sortLogsByTime(logs), [logs])
  const filteredLogs = useMemo(() => filterLogs(sortedLogs, filter), [sortedLogs, filter])

  // 处理筛选变化
  const handleFilterChange = (newFilter: LogFilter) => {
    setFilter(newFilter)
    onFilter?.(newFilter)
  }

  // 处理清空确认
  const handleClearConfirm = () => {
    onClear()
    setShowClearConfirm(false)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 筛选栏 */}
      <LogFilterBar
        filter={filter}
        onFilterChange={handleFilterChange}
        onClear={() => setShowClearConfirm(true)}
        logCount={logs.length}
        filteredCount={filteredLogs.length}
      />

      {/* 日志列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-secondary">
            {logs.length === 0 ? '暂无日志' : '没有符合条件的日志'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))
        )}
      </div>

      {/* 清空确认对话框 */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearConfirm}
        title="清空日志"
        message={`确定要清空所有 ${logs.length} 条日志吗？此操作无法撤销。`}
        confirmText="清空"
        cancelText="取消"
        danger
      />
    </div>
  )
}
