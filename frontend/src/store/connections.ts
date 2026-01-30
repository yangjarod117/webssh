import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavedConnection, ConnectionConfig } from '../types'

interface ConnectionsState {
  savedConnections: SavedConnection[]
  
  // Actions
  saveConnection: (config: ConnectionConfig, name: string, saveCredentials?: boolean) => Promise<string>
  deleteConnection: (id: string) => Promise<void>
  updateConnectionName: (id: string, name: string) => void
  updateConnection: (id: string, updates: Partial<Omit<SavedConnection, 'id' | 'createdAt'>>) => void
  updateLastUsed: (id: string) => void
  getConnection: (id: string) => SavedConnection | undefined
  hasStoredCredentials: (id: string) => Promise<boolean>
  getStoredCredentials: (id: string) => Promise<ConnectionConfig | null>
}

const STORAGE_KEY = 'webssh-connections'

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 连接配置状态管理
 */
export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set, get) => ({
      savedConnections: [],
      
      saveConnection: async (config: ConnectionConfig, name: string, saveCredentials = false) => {
        const id = generateId()
        const now = new Date()
        
        // 如果选择保存凭据，发送到后端加密存储
        if (saveCredentials) {
          try {
            await fetch('/api/credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id,
                host: config.host,
                port: config.port,
                username: config.username,
                authType: config.authType,
                password: config.password,
                privateKey: config.privateKey,
                passphrase: config.passphrase,
              }),
            })
          } catch (err) {
            console.error('Failed to save credentials:', err)
          }
        }
        
        // 创建保存的连接（前端不保存密码）
        const savedConnection: SavedConnection = {
          id,
          name,
          host: config.host,
          port: config.port,
          username: config.username,
          authType: config.authType,
          hasStoredCredentials: saveCredentials,
          createdAt: now,
          lastUsedAt: now,
        }
        
        set((state) => ({
          savedConnections: [...state.savedConnections, savedConnection],
        }))
        
        return id
      },
      
      deleteConnection: async (id: string) => {
        // 同时删除后端存储的凭据
        try {
          await fetch(`/api/credentials/${id}`, { method: 'DELETE' })
        } catch (err) {
          console.error('Failed to delete credentials:', err)
        }
        
        set((state) => ({
          savedConnections: state.savedConnections.filter((c) => c.id !== id),
        }))
      },
      
      updateConnectionName: (id: string, name: string) => {
        set((state) => ({
          savedConnections: state.savedConnections.map((c) =>
            c.id === id ? { ...c, name } : c
          ),
        }))
      },
      
      updateConnection: (id: string, updates: Partial<Omit<SavedConnection, 'id' | 'createdAt'>>) => {
        set((state) => ({
          savedConnections: state.savedConnections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }))
      },
      
      updateLastUsed: (id: string) => {
        set((state) => ({
          savedConnections: state.savedConnections.map((c) =>
            c.id === id ? { ...c, lastUsedAt: new Date() } : c
          ),
        }))
      },
      
      getConnection: (id: string) => {
        return get().savedConnections.find((c) => c.id === id)
      },
      
      hasStoredCredentials: async (id: string) => {
        try {
          const response = await fetch(`/api/credentials/${id}/exists`)
          const data = await response.json()
          return data.exists
        } catch {
          return false
        }
      },
      
      getStoredCredentials: async (id: string) => {
        try {
          const response = await fetch(`/api/credentials/${id}`)
          if (!response.ok) return null
          return await response.json()
        } catch {
          return null
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        savedConnections: state.savedConnections,
      }),
    }
  )
)

// 纯函数用于测试

/**
 * 序列化连接配置（不包含密码）
 */
export function serializeConnection(config: ConnectionConfig, name: string, id: string): SavedConnection {
  return {
    id,
    name,
    host: config.host,
    port: config.port,
    username: config.username,
    authType: config.authType,
    createdAt: new Date(),
    lastUsedAt: new Date(),
  }
}

/**
 * 检查序列化后的连接是否包含密码
 * 注意：只检查是否有 "password": 或 "privateKey": 这样的键值对，
 * 而不是检查字符串中是否包含 "password"（因为 authType 可能是 "password"）
 */
export function connectionContainsPassword(connection: SavedConnection): boolean {
  // 检查对象是否有 password 或 privateKey 属性
  const hasPasswordField = 'password' in connection && (connection as Record<string, unknown>).password !== undefined
  const hasPrivateKeyField = 'privateKey' in connection && (connection as Record<string, unknown>).privateKey !== undefined
  return hasPasswordField || hasPrivateKeyField
}

/**
 * 从列表中删除连接
 */
export function removeConnection(connections: SavedConnection[], id: string): SavedConnection[] {
  return connections.filter((c) => c.id !== id)
}

/**
 * 检查连接是否存在于列表中
 */
export function connectionExists(connections: SavedConnection[], id: string): boolean {
  return connections.some((c) => c.id === id)
}
