import { create } from 'zustand'
import type { Tab } from '../types'

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
  
  // Actions
  addTab: (sessionId: string, name?: string) => string
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, name: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  updateTabConnection: (tabId: string, isConnected: boolean) => void
}

/**
 * 生成唯一 ID
 */
function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 标签页状态管理
 */
export const useTabsStore = create<TabsState>()((set, get) => ({
  tabs: [],
  activeTabId: null,
  
  addTab: (sessionId: string, name?: string) => {
    const id = generateTabId()
    const tabCount = get().tabs.length
    
    const newTab: Tab = {
      id,
      name: name || `终端 ${tabCount + 1}`,
      sessionId,
      isConnected: false,
    }
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }))
    
    return id
  },
  
  removeTab: (tabId: string) => {
    const state = get()
    const tabIndex = state.tabs.findIndex((t) => t.id === tabId)
    
    if (tabIndex === -1) return
    
    const newTabs = state.tabs.filter((t) => t.id !== tabId)
    let newActiveTabId = state.activeTabId
    
    // 如果删除的是当前活动标签页，切换到相邻的标签页
    if (state.activeTabId === tabId) {
      if (newTabs.length === 0) {
        newActiveTabId = null
      } else if (tabIndex >= newTabs.length) {
        newActiveTabId = newTabs[newTabs.length - 1].id
      } else {
        newActiveTabId = newTabs[tabIndex].id
      }
    }
    
    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
    })
  },
  
  setActiveTab: (tabId: string) => {
    const tabExists = get().tabs.some((t) => t.id === tabId)
    if (tabExists) {
      set({ activeTabId: tabId })
    }
  },
  
  renameTab: (tabId: string, name: string) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, name } : t)),
    }))
  },
  
  reorderTabs: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newTabs = [...state.tabs]
      const [removed] = newTabs.splice(fromIndex, 1)
      if (removed) {
        newTabs.splice(toIndex, 0, removed)
      }
      return { tabs: newTabs }
    })
  },
  
  updateTabConnection: (tabId: string, isConnected: boolean) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isConnected } : t)),
    }))
  },
}))

// 纯函数用于测试

/**
 * 添加标签页到列表
 */
export function addTabToList(tabs: Tab[], newTab: Tab): Tab[] {
  return [...tabs, newTab]
}

/**
 * 从列表中删除标签页
 */
export function removeTabFromList(tabs: Tab[], tabId: string): Tab[] {
  return tabs.filter((t) => t.id !== tabId)
}

/**
 * 切换活动标签页
 */
export function switchActiveTab(tabs: Tab[], tabId: string): string | null {
  const tabExists = tabs.some((t) => t.id === tabId)
  return tabExists ? tabId : null
}

/**
 * 重排标签页
 */
export function reorderTabList(tabs: Tab[], fromIndex: number, toIndex: number): Tab[] {
  if (fromIndex < 0 || fromIndex >= tabs.length) return tabs
  if (toIndex < 0 || toIndex >= tabs.length) return tabs
  
  const newTabs = [...tabs]
  const [removed] = newTabs.splice(fromIndex, 1)
  if (removed) {
    newTabs.splice(toIndex, 0, removed)
  }
  return newTabs
}

/**
 * 检查标签页是否存在
 */
export function tabExists(tabs: Tab[], tabId: string): boolean {
  return tabs.some((t) => t.id === tabId)
}
