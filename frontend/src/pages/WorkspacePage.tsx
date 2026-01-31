import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  TabBar, SplitLayout, FileManagerComplete, FileEditor, TerminalPanel,
  LogPanel, ThemeSelector, LargeFileWarningDialog, isLargeFile, SidePanel,
} from '../components'
import { useTabsStore, useEditorStore } from '../store'
import { createLogEntry, addLog as addLogToList, clearLogs as clearLogsList } from '../utils/logs'
import type { FileItem, LogEntry, SessionState } from '../types'

interface WorkspacePageProps {
  session: SessionState
  sessions: Map<string, SessionState>
  onDisconnect: () => void
  onAddConnection: () => void
}

export function WorkspacePage({ session, sessions, onDisconnect, onAddConnection }: WorkspacePageProps) {
  const [showLogPanel, setShowLogPanel] = useState(false)
  const terminalWsMapRef = useRef<Map<string, WebSocket>>(new Map())
  const [logsMap, setLogsMap] = useState<Map<string, LogEntry[]>>(new Map())
  const [largeFileWarning, setLargeFileWarning] = useState<{ file: FileItem; sessionId: string } | null>(null)
  const [editorState, setEditorState] = useState<{ fileId: string; sessionId: string } | null>(null)
  
  const { tabs, activeTabId, updateTabConnection } = useTabsStore()
  const { openFile, closeFile, openFiles } = useEditorStore()

  const activeTab = tabs.find(t => t.id === activeTabId)
  const currentSession = useMemo(() => 
    activeTab ? sessions.get(activeTab.sessionId) || session : session
  , [activeTab, sessions, session])
  const activeSessionId = activeTab?.sessionId || currentSession.id
  const currentLogs = logsMap.get(activeSessionId) || []

  const addLogForSession = useCallback((sessionId: string, log: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLogsMap(prev => {
      const newMap = new Map(prev)
      newMap.set(sessionId, addLogToList(newMap.get(sessionId) || [], createLogEntry(log.level, log.category, log.message, log.details)))
      return newMap
    })
  }, [])

  useEffect(() => {
    sessions.forEach((sess, sessionId) => {
      if (!logsMap.has(sessionId)) {
        addLogForSession(sessionId, {
          level: 'info', category: 'connection',
          message: `已连接到 ${sess.config.host}:${sess.config.port}`,
          details: { host: sess.config.host, port: sess.config.port, username: sess.config.username },
        })
      }
    })
  }, [sessions, logsMap, addLogForSession])

  useEffect(() => {
    if (activeTabId) updateTabConnection(activeTabId, session.status === 'connected')
  }, [activeTabId, session.status, updateTabConnection])

  const doLoadFileForSession = useCallback(async (file: FileItem, sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files/content?path=${encodeURIComponent(file.path)}`)
      if (!response.ok) throw new Error('加载文件失败')
      const data = await response.json()
      const fileId = openFile(file.path, data.content || '')
      setEditorState({ fileId, sessionId })
      addLogForSession(sessionId, { level: 'info', category: 'file', message: `打开文件: ${file.path}` })
    } catch (error) {
      addLogForSession(sessionId, {
        level: 'error', category: 'file', message: `打开文件失败: ${file.path}`,
        details: { error: error instanceof Error ? error.message : '未知错误' },
      })
    }
  }, [openFile, addLogForSession])

  const loadFileContentForSession = useCallback(async (file: FileItem, sessionId: string) => {
    if (isLargeFile(file.size)) {
      setLargeFileWarning({ file, sessionId })
      return
    }
    await doLoadFileForSession(file, sessionId)
  }, [doLoadFileForSession])

  const handleSaveFile = useCallback(async (path: string, content: string) => {
    const sessionId = editorState?.sessionId || activeSessionId
    try {
      const response = await fetch(`/api/sessions/${sessionId}/files/content`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })
      if (!response.ok) throw new Error('保存失败')
      addLogForSession(sessionId, { level: 'info', category: 'file', message: `保存文件: ${path}` })
    } catch (error) {
      addLogForSession(sessionId, {
        level: 'error', category: 'file', message: `保存文件失败: ${path}`,
        details: { error: error instanceof Error ? error.message : '未知错误' },
      })
      throw error
    }
  }, [editorState, activeSessionId, addLogForSession])

  const handleCloseEditor = useCallback(() => {
    if (editorState?.fileId) closeFile(editorState.fileId)
    setEditorState(null)
  }, [editorState, closeFile])

  const handleClearLogs = useCallback(() => {
    setLogsMap(prev => new Map(prev).set(activeSessionId, clearLogsList()))
  }, [activeSessionId])

  const handleDisconnect = useCallback(() => {
    addLogForSession(activeSessionId, { level: 'info', category: 'connection', message: `断开连接: ${currentSession.config.host}` })
    onDisconnect()
  }, [activeSessionId, currentSession.config.host, onDisconnect, addLogForSession])

  const handleLargeFileConfirm = useCallback(() => {
    if (largeFileWarning) {
      doLoadFileForSession(largeFileWarning.file, largeFileWarning.sessionId)
      setLargeFileWarning(null)
    }
  }, [largeFileWarning, doLoadFileForSession])

  const sessionEntries = Array.from(sessions.entries())
  const hasOpenFile = editorState && openFiles.has(editorState.fileId)

  const renderSessionPanel = (sessionId: string, Component: React.ComponentType<any>, props: any, keyPrefix: string) => {
    const isActive = sessionId === activeSessionId
    return (
      <div key={`${keyPrefix}-${sessionId}`} className="absolute inset-0"
        style={{ visibility: isActive ? 'visible' : 'hidden', zIndex: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}>
        <Component {...props} />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${currentSession.status === 'connected' ? 'bg-success' : 'bg-error'}`} />
            <span className="text-sm text-text">{currentSession.config.username}@{currentSession.config.host}:{currentSession.config.port}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddConnection} className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-success transition-colors" title="添加新连接">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button onClick={() => setShowLogPanel(!showLogPanel)} className={`p-2 rounded-lg transition-colors ${showLogPanel ? 'bg-primary text-white' : 'hover:bg-surface text-text-secondary'}`} title="日志面板">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </button>
          <ThemeSelector />
          <button onClick={handleDisconnect} className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors text-sm">断开连接</button>
        </div>
      </header>

      <TabBar onAddConnection={onAddConnection} />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="flex-1">
            <SplitLayout
              left={
                <div className="w-full h-full relative">
                  {sessionEntries.map(([sessionId]) => renderSessionPanel(sessionId, FileManagerComplete, {
                    sessionId,
                    onFileEdit: (file: FileItem) => loadFileContentForSession(file, sessionId),
                    onFileOpen: (file: FileItem) => loadFileContentForSession(file, sessionId),
                    onOpenTerminalInDir: (path: string) => {
                      const ws = terminalWsMapRef.current.get(sessionId)
                      if (ws?.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'input', sessionId, data: `cd "${path}"\n` }))
                      }
                    },
                  }, 'fm'))}
                </div>
              }
              right={
                <div className="w-full h-full relative">
                  {sessionEntries.map(([sessionId]) => renderSessionPanel(sessionId, TerminalPanel, {
                    sessionId,
                    isActive: sessionId === activeSessionId,
                    onWsReady: (ws: WebSocket) => terminalWsMapRef.current.set(sessionId, ws),
                  }, 'term'))}
                </div>
              }
            />
          </div>
          {showLogPanel && <div className="w-80 border-l border-border"><LogPanel logs={currentLogs} onClear={handleClearLogs} /></div>}
        </div>
      </main>

      {/* 文件编辑器弹窗 */}
      {editorState && hasOpenFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-xl shadow-2xl border border-border overflow-hidden" style={{ width: '80vw', height: '80vh', maxWidth: '1200px', maxHeight: '800px' }}>
            <div className="flex items-center justify-between px-4 py-2 bg-surface/80 border-b border-border">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-sm font-medium text-text truncate max-w-md">{editorState.fileId}</span>
              </div>
              <button onClick={handleCloseEditor} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text transition-colors" title="关闭">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="h-[calc(100%-44px)]"><FileEditor fileId={editorState.fileId} onSave={handleSaveFile} onClose={handleCloseEditor} /></div>
          </div>
        </div>
      )}

      {largeFileWarning && (
        <LargeFileWarningDialog isOpen={true} onClose={() => setLargeFileWarning(null)} onConfirm={handleLargeFileConfirm} fileName={largeFileWarning.file.name} fileSize={largeFileWarning.file.size} />
      )}

      {/* 侧边面板 */}
      {sessionEntries.map(([sessionId]) => (
        <div key={`sidepanel-${sessionId}`} style={{ visibility: sessionId === activeSessionId ? 'visible' : 'hidden', pointerEvents: sessionId === activeSessionId ? 'auto' : 'none' }}>
          <SidePanel sessionId={sessionId} />
        </div>
      ))}
    </div>
  )
}
