import { useState, useEffect, useCallback } from 'react'

interface LoginRecord {
  user: string
  ip: string
  time: string
  duration: string
  status: 'success' | 'failed' | 'current'
}

interface LoginHistoryProps {
  sessionId: string
}

/**
 * 登录历史组件
 */
export function LoginHistory({ sessionId }: LoginHistoryProps) {
  const [history, setHistory] = useState<LoginRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/login-history`)
      if (!response.ok) {
        throw new Error('获取登录历史失败')
      }
      const data = await response.json()
      setHistory(data.history || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchHistory()
    // 每 30 秒刷新一次
    const interval = setInterval(fetchHistory, 30000)
    return () => clearInterval(interval)
  }, [fetchHistory])

  const getStatusColor = (status: LoginRecord['status']) => {
    switch (status) {
      case 'current':
        return 'text-success'
      case 'failed':
        return 'text-error'
      default:
        return 'text-text-secondary'
    }
  }

  const getStatusIcon = (status: LoginRecord['status']) => {
    switch (status) {
      case 'current':
        return (
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="当前在线" />
        )
      case 'failed':
        return (
          <svg className="w-3 h-3 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>登录失败</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      default:
        return (
          <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-80 p-2 bg-surface border border-border rounded-lg shadow-lg hover:bg-surface/80 transition-colors z-40"
        title="展开登录历史"
      >
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-80 w-80 bg-surface border border-border rounded-lg shadow-lg z-40 max-h-96 flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-text">登录历史</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchHistory}
            disabled={isLoading}
            className={`p-1 rounded hover:bg-border/50 text-text-secondary ${isLoading ? 'animate-spin' : ''}`}
            title="刷新"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded hover:bg-border/50 text-text-secondary"
            title="收起"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-2">
        {error ? (
          <div className="text-sm text-error text-center py-4">{error}</div>
        ) : isLoading && history.length === 0 ? (
          <div className="text-sm text-text-secondary text-center py-4">加载中...</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-text-secondary text-center py-4">暂无登录记录</div>
        ) : (
          <div className="space-y-1">
            {history.map((record, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg text-xs ${
                  record.status === 'failed' 
                    ? 'bg-error/10 border border-error/20' 
                    : record.status === 'current'
                    ? 'bg-success/10 border border-success/20'
                    : 'bg-background'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(record.status)}
                    <span className={`font-medium ${getStatusColor(record.status)}`}>
                      {record.user}
                    </span>
                  </div>
                  <span className={`${record.status === 'failed' ? 'text-error' : 'text-text-secondary'}`}>
                    {record.status === 'failed' ? '失败' : record.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="font-mono">{record.ip}</span>
                  <span>{record.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 提示 */}
      {history.some(r => r.status === 'failed') && (
        <div className="px-3 py-2 border-t border-border bg-error/5 text-xs text-error flex-shrink-0">
          ⚠️ 检测到失败的登录尝试，请注意安全
        </div>
      )}
    </div>
  )
}
