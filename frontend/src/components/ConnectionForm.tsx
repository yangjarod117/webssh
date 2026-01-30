import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { ConnectionConfig } from '../types'

interface ConnectionFormProps {
  onConnect: (config: ConnectionConfig, saveConnection?: { save: boolean; name: string; saveCredentials?: boolean }) => Promise<void>
  isLoading?: boolean
  initialConfig?: Partial<ConnectionConfig>
  isEditMode?: boolean
}

/**
 * SSH 连接表单组件
 * Requirements: 8.1, 8.2 - 现代化 UI 设计和平滑动画
 */
export function ConnectionForm({ onConnect, isLoading = false, initialConfig, isEditMode = false }: ConnectionFormProps) {
  const [host, setHost] = useState(initialConfig?.host || '')
  const [port, setPort] = useState(String(initialConfig?.port || 22))
  const [username, setUsername] = useState(initialConfig?.username || '')
  const [authType, setAuthType] = useState<'password' | 'key'>(initialConfig?.authType || 'password')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [saveConnection, setSaveConnection] = useState(false)
  const [saveCredentials, setSaveCredentials] = useState(false)
  const [connectionName, setConnectionName] = useState('')
  const [error, setError] = useState('')

  // 当 initialConfig 变化时更新表单
  useEffect(() => {
    if (initialConfig) {
      setHost(initialConfig.host || '')
      setPort(String(initialConfig.port || 22))
      setUsername(initialConfig.username || '')
      setAuthType(initialConfig.authType || 'password')
      // 不设置密码和私钥，需要用户重新输入
      setPassword('')
      setPrivateKey('')
      setPassphrase('')
      // 如果是编辑模式，不显示保存选项
      setSaveConnection(false)
      setConnectionName('')
    }
  }, [initialConfig])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证
    if (!host.trim()) {
      setError('请输入服务器地址')
      return
    }
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (authType === 'password' && !password) {
      setError('请输入密码')
      return
    }
    if (authType === 'key' && !privateKey) {
      setError('请选择或粘贴私钥')
      return
    }

    const config: ConnectionConfig = {
      host: host.trim(),
      port: parseInt(port, 10) || 22,
      username: username.trim(),
      authType,
      ...(authType === 'password' ? { password } : { privateKey, passphrase: passphrase || undefined }),
    }

    try {
      await onConnect(config, saveConnection ? { save: true, name: connectionName.trim() || `${username}@${host}`, saveCredentials } : undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败')
    }
  }

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPrivateKey(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto p-6 card shadow-theme-xl"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-semibold mb-6 text-center text-text">SSH 连接</h2>

      {/* 服务器地址 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">服务器地址</label>
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="example.com 或 192.168.1.1"
          className="input"
          disabled={isLoading}
        />
      </div>

      {/* 端口 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">端口</label>
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          placeholder="22"
          className="input"
          disabled={isLoading}
        />
      </div>

      {/* 用户名 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1.5 text-text-secondary">用户名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="root"
          className="input"
          disabled={isLoading}
        />
      </div>

      {/* 认证方式 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-text-secondary">认证方式</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="authType"
              value="password"
              checked={authType === 'password'}
              onChange={() => setAuthType('password')}
              className="w-4 h-4 text-primary accent-primary"
              disabled={isLoading}
            />
            <span className="text-sm text-text-secondary group-hover:text-text transition-colors">密码</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="authType"
              value="key"
              checked={authType === 'key'}
              onChange={() => setAuthType('key')}
              className="w-4 h-4 text-primary accent-primary"
              disabled={isLoading}
            />
            <span className="text-sm text-text-secondary group-hover:text-text transition-colors">SSH 密钥</span>
          </label>
        </div>
      </div>

      {/* 密码输入 */}
      {authType === 'password' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4"
        >
          <label className="block text-sm font-medium mb-1.5 text-text-secondary">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            className="input"
            disabled={isLoading}
          />
        </motion.div>
      )}

      {/* 密钥输入 */}
      {authType === 'key' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4"
        >
          <label className="block text-sm font-medium mb-1.5 text-text-secondary">私钥</label>
          <div className="space-y-2">
            <input
              type="file"
              onChange={handleKeyFileChange}
              className="
                w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4 
                file:rounded-theme-lg file:border-0 
                file:bg-primary file:text-white 
                file:cursor-pointer file:transition-all file:duration-normal
                file:hover:bg-primary-hover
              "
              disabled={isLoading}
            />
            <textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="或粘贴私钥内容..."
              rows={4}
              className="input font-mono text-xs resize-none"
              disabled={isLoading}
            />
          </div>
          
          {/* 私钥密码 */}
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1.5 text-text-secondary">私钥密码（可选）</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="如果私钥有密码保护，请输入"
              className="input"
              disabled={isLoading}
            />
          </div>
        </motion.div>
      )}

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-error/10 border border-error/30 rounded-theme-lg text-error text-sm"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </motion.div>
      )}

      {/* 保存连接选项 */}
      {!isEditMode && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={saveConnection}
              onChange={(e) => setSaveConnection(e.target.checked)}
              className="w-4 h-4 text-primary accent-primary rounded"
              disabled={isLoading}
            />
            <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
              保存此连接
            </span>
          </label>
          
          {/* 连接名称输入 */}
          {saveConnection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 space-y-2"
            >
              <input
                type="text"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder={`连接名称（默认：${username || 'user'}@${host || 'host'}）`}
                className="input text-sm"
                disabled={isLoading}
              />
              
              {/* 保存凭据选项 */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={saveCredentials}
                  onChange={(e) => setSaveCredentials(e.target.checked)}
                  className="w-4 h-4 text-primary accent-primary rounded"
                  disabled={isLoading}
                />
                <span className="text-sm text-text-secondary group-hover:text-text transition-colors">
                  记住凭据（加密存储）
                </span>
              </label>
              {saveCredentials && (
                <p className="text-xs text-text-muted ml-6">
                  🔒 凭据将使用 AES-256 加密存储在服务器，下次可一键连接
                </p>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* 连接按钮 */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary w-full py-3 text-base ripple"
      >
        {isLoading ? (
          <>
            <span className="spinner" />
            连接中...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            连接
          </>
        )}
      </button>
    </motion.form>
  )
}
