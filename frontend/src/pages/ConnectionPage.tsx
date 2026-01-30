import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ConnectionForm, SavedConnectionList, ThemeSelector } from '../components'
import { useConnectionsStore } from '../store'
import type { ConnectionConfig, SavedConnection } from '../types'

interface ConnectionPageProps {
  onConnect: (config: ConnectionConfig, connectionName?: string) => Promise<void>
  onBack?: () => void
}

/**
 * 连接页面组件
 * 显示连接表单和已保存的连接列表
 * Requirements: 1.1, 1.2, 6.1, 6.2, 6.3, 6.4, 8.1, 8.2
 */
export function ConnectionPage({ onConnect, onBack }: ConnectionPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedConnection, setSelectedConnection] = useState<SavedConnection | null>(null)
  
  const { saveConnection, updateLastUsed } = useConnectionsStore()

  const handleConnect = useCallback(async (config: ConnectionConfig, saveInfo?: { save: boolean; name: string; saveCredentials?: boolean }) => {
    setIsLoading(true)
    setError(null)
    try {
      await onConnect(config, selectedConnection?.name || saveInfo?.name)
      
      // 如果选择了保存连接
      if (saveInfo?.save) {
        await saveConnection(config, saveInfo.name, saveInfo.saveCredentials)
      }
      
      if (selectedConnection) {
        updateLastUsed(selectedConnection.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败')
    } finally {
      setIsLoading(false)
    }
  }, [onConnect, selectedConnection, updateLastUsed, saveConnection])

  const handleSelectSaved = useCallback((connection: SavedConnection) => {
    setSelectedConnection(connection)
  }, [])

  // 快速连接（从已保存的连接直接登录）
  const handleQuickConnect = useCallback(async (config: ConnectionConfig) => {
    setError(null)
    try {
      // 找到对应的连接并更新最后使用时间
      const connection = useConnectionsStore.getState().savedConnections.find(
        c => c.host === config.host && c.username === config.username && c.port === config.port
      )
      
      await onConnect(config, connection?.name)
      
      if (connection) {
        updateLastUsed(connection.id)
      }
    } catch (err) {
      throw err // 让弹窗显示错误
    }
  }, [onConnect, updateLastUsed])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          {/* 返回按钮（如果有已连接的会话） */}
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-surface text-text-secondary hover:text-text transition-colors"
              title="返回工作区"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          {/* Logo */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text">
            {onBack ? '添加新连接' : 'WebSSH Terminal'}
          </h1>
        </div>
        
        {/* 主题切换按钮 */}
        <ThemeSelector />
      </header>

      {/* 主内容区 */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 连接表单 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConnectionForm
              onConnect={handleConnect}
              isLoading={isLoading}
              isEditMode={!!selectedConnection}
              initialConfig={selectedConnection ? {
                host: selectedConnection.host,
                port: selectedConnection.port,
                username: selectedConnection.username,
                authType: selectedConnection.authType,
              } : undefined}
            />
            
            {/* 错误提示 */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm"
              >
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* 已保存的连接列表 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="card p-6"
          >
            <SavedConnectionList
              onSelect={handleSelectSaved}
              onQuickConnect={handleQuickConnect}
            />
          </motion.div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="py-4 text-center text-text-muted text-sm border-t border-border">
        <p>WebSSH Terminal &copy; 2026</p>
      </footer>
    </div>
  )
}
