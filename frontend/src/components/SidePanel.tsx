import { useState, useEffect, useRef, useCallback } from 'react'

interface MonitorData {
  cpu: { usage: number }
  memory: { total: number; used: number; usagePercent: number }
  disk: { total: number; used: number; usagePercent: number }
  network: { rxBytes: number; txBytes: number }
  system: { uptime: string; load: { load1: number; load5: number; load15: number } }
  timestamp: number
}
interface ProcessInfo { user: string; name: string; memoryMB: number; memoryPercent: number }
interface LoginRecord { user: string; ip: string; time: string; duration: string; status: 'success' | 'failed' | 'current' }

const formatBytes = (bytes: number, decimals = 1) => {
  if (bytes === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}
const formatSpeed = (bps: number) => {
  if (bps === 0) return '0 B/s'
  const k = 1024, sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'], i = Math.floor(Math.log(bps) / Math.log(k))
  return parseFloat((bps / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const colorClass = value >= 90 ? 'bg-error' : value >= 70 ? 'bg-warning' : color
  return <div className="h-1.5 bg-border rounded-full overflow-hidden"><div className={`h-full ${colorClass} transition-all duration-300`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
}

export function SidePanel({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'monitor' | 'history'>('monitor')
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  const [networkSpeed, setNetworkSpeed] = useState({ rx: 0, tx: 0 })
  const [topProcesses, setTopProcesses] = useState<ProcessInfo[]>([])
  const [showProcesses, setShowProcesses] = useState(false)
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const prevNetworkRef = useRef<{ rx: number; tx: number; time: number } | null>(null)

  const fetchMonitorData = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/monitor`)
      if (!response.ok) throw new Error('获取监控数据失败')
      const newData: MonitorData = await response.json()
      if (prevNetworkRef.current) {
        const timeDiff = (newData.timestamp - prevNetworkRef.current.time) / 1000
        if (timeDiff > 0) setNetworkSpeed({ rx: Math.max(0, (newData.network.rxBytes - prevNetworkRef.current.rx) / timeDiff), tx: Math.max(0, (newData.network.txBytes - prevNetworkRef.current.tx) / timeDiff) })
      }
      prevNetworkRef.current = { rx: newData.network.rxBytes, tx: newData.network.txBytes, time: newData.timestamp }
      setMonitorData(newData); setMonitorError(null)
    } catch (e) { setMonitorError(e instanceof Error ? e.message : '未知错误') }
  }, [sessionId])

  const fetchTopProcesses = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/top-processes`)
      if (response.ok) setTopProcesses((await response.json()).processes || [])
    } catch { setTopProcesses([]) }
  }, [sessionId])

  const fetchLoginHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/sessions/${sessionId}/login-history`)
      if (!response.ok) throw new Error('获取登录历史失败')
      setLoginHistory((await response.json()).history || []); setHistoryError(null)
    } catch (e) { setHistoryError(e instanceof Error ? e.message : '未知错误') }
    finally { setHistoryLoading(false) }
  }, [sessionId])

  useEffect(() => {
    fetchMonitorData(); fetchLoginHistory()
    const m = setInterval(fetchMonitorData, 3000), h = setInterval(fetchLoginHistory, 30000)
    return () => { clearInterval(m); clearInterval(h) }
  }, [fetchMonitorData, fetchLoginHistory])

  const getStatusIcon = (status: LoginRecord['status']) => {
    if (status === 'current') return <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
    if (status === 'failed') return <svg className="w-3 h-3 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    return <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
  }
  const getStatusColor = (status: LoginRecord['status']) => status === 'current' ? 'text-success' : status === 'failed' ? 'text-error' : 'text-text-secondary'

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className={`fixed top-1/2 -translate-y-1/2 z-50 p-2 rounded-l-lg shadow-lg transition-all duration-300 ${isOpen ? 'right-80 bg-primary text-white' : 'right-0 bg-surface border border-border border-r-0 hover:bg-surface/80'}`} title={isOpen ? '收起面板' : '展开面板'}>
        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>

      <div className={`fixed top-0 right-0 h-full w-80 bg-surface border-l border-border shadow-xl z-40 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex border-b border-border">
          <button onClick={() => setActiveTab('monitor')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'monitor' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text'}`}>系统监控</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text'}`}>
            登录历史{loginHistory.some(r => r.status === 'failed') && <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />}
          </button>
        </div>

        <div className="h-[calc(100%-49px)] overflow-y-auto">
          {activeTab === 'monitor' ? (
            <div className="p-4 space-y-4">
              {monitorError ? <div className="text-sm text-error text-center py-4">{monitorError}</div>
              : !monitorData ? <div className="text-sm text-text-secondary text-center py-4">加载中...</div>
              : <>
                <div><div className="flex items-center justify-between mb-1"><span className="text-xs text-text-secondary">CPU</span><span className="text-xs font-medium text-text">{monitorData.cpu.usage.toFixed(1)}%</span></div><ProgressBar value={monitorData.cpu.usage} color="bg-primary" /></div>
                <div className="relative" onMouseEnter={() => { setShowProcesses(true); fetchTopProcesses() }} onMouseLeave={() => setShowProcesses(false)}>
                  <div className="flex items-center justify-between mb-1"><span className="text-xs text-text-secondary">内存</span><span className="text-xs font-medium text-text">{formatBytes(monitorData.memory.used)} / {formatBytes(monitorData.memory.total)}</span></div>
                  <ProgressBar value={monitorData.memory.usagePercent} color="bg-accent" />
                  {showProcesses && topProcesses.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-background border border-border rounded-lg shadow-lg z-50 p-2">
                      <div className="text-xs font-medium text-text-secondary mb-2 px-1">内存占用 Top 10</div>
                      <table className="w-full text-xs"><thead><tr className="text-text-secondary"><th className="text-left py-1 px-1">用户</th><th className="text-left py-1 px-1">程序</th><th className="text-right py-1 px-1">内存</th><th className="text-right py-1 px-1">占比</th></tr></thead>
                        <tbody>{topProcesses.map((p, i) => <tr key={i} className="text-text hover:bg-surface/50"><td className="py-1 px-1 truncate max-w-[60px]">{p.user}</td><td className="py-1 px-1 truncate max-w-[80px]">{p.name}</td><td className="py-1 px-1 text-right">{p.memoryMB.toFixed(1)}M</td><td className="py-1 px-1 text-right">{p.memoryPercent.toFixed(1)}%</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div><div className="flex items-center justify-between mb-1"><span className="text-xs text-text-secondary">磁盘</span><span className="text-xs font-medium text-text">{formatBytes(monitorData.disk.used)} / {formatBytes(monitorData.disk.total)}</span></div><ProgressBar value={monitorData.disk.usagePercent} color="bg-success" /></div>
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-text-secondary mb-2">网络流量</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1"><svg className="w-3 h-3 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg><span className="text-text-secondary">下载</span><span className="text-text font-medium ml-auto">{formatSpeed(networkSpeed.rx)}</span></div>
                    <div className="flex items-center gap-1"><svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg><span className="text-text-secondary">上传</span><span className="text-text font-medium ml-auto">{formatSpeed(networkSpeed.tx)}</span></div>
                  </div>
                </div>
                <div className="pt-2 border-t border-border text-xs space-y-1">
                  <div className="flex justify-between text-text-secondary"><span>运行时间</span><span className="text-text">{monitorData.system.uptime}</span></div>
                  <div className="flex justify-between text-text-secondary"><span>负载</span><span className="text-text">{monitorData.system.load.load1.toFixed(2)} / {monitorData.system.load.load5.toFixed(2)} / {monitorData.system.load.load15.toFixed(2)}</span></div>
                </div>
              </>}
            </div>
          ) : (
            <div className="p-2">
              {historyError ? <div className="text-sm text-error text-center py-4">{historyError}</div>
              : historyLoading && loginHistory.length === 0 ? <div className="text-sm text-text-secondary text-center py-4">加载中...</div>
              : loginHistory.length === 0 ? <div className="text-sm text-text-secondary text-center py-4">暂无登录记录</div>
              : <div className="space-y-1">
                  {loginHistory.map((r, i) => (
                    <div key={i} className={`p-2 rounded-lg text-xs ${r.status === 'failed' ? 'bg-error/10 border border-error/20' : r.status === 'current' ? 'bg-success/10 border border-success/20' : 'bg-background'}`}>
                      <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-1.5">{getStatusIcon(r.status)}<span className={`font-medium ${getStatusColor(r.status)}`}>{r.user}</span></div><span className={r.status === 'failed' ? 'text-error' : 'text-text-secondary'}>{r.status === 'failed' ? '失败' : r.duration}</span></div>
                      <div className="flex items-center justify-between text-text-secondary"><span className="font-mono">{r.ip}</span><span>{r.time}</span></div>
                    </div>
                  ))}
                </div>}
              {loginHistory.some(r => r.status === 'failed') && <div className="mt-2 p-2 bg-error/10 border border-error/20 rounded-lg text-xs text-error">⚠️ 检测到失败的登录尝试，请注意安全</div>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
