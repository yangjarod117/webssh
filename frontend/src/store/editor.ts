import { create } from 'zustand'
import type { EditorFile } from '../types'

interface EditorState {
  openFiles: Map<string, EditorFile>
  activeFileId: string | null
  
  // Actions
  openFile: (path: string, content: string) => string
  closeFile: (fileId: string) => void
  updateFileContent: (fileId: string, content: string) => void
  markFileSaved: (fileId: string) => void
  getFile: (fileId: string) => EditorFile | undefined
  hasUnsavedChanges: () => boolean
}

/**
 * 生成文件 ID
 */
function generateFileId(path: string): string {
  return `file_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
}

/**
 * 编辑器状态管理
 */
export const useEditorStore = create<EditorState>()((set: (fn: (state: EditorState) => Partial<EditorState> | EditorState) => void, get: () => EditorState) => ({
  openFiles: new Map(),
  activeFileId: null,
  
  openFile: (path: string, content: string) => {
    // 检查文件是否已经打开
    const existingFile = Array.from(get().openFiles.values()).find((f: EditorFile) => f.path === path)
    if (existingFile) {
      set(() => ({ activeFileId: existingFile.id }))
      return existingFile.id
    }
    
    const id = generateFileId(path)
    const newFile: EditorFile = {
      id,
      path,
      content,
      originalContent: content,
      isDirty: false,
    }
    
    set((state: EditorState) => {
      const newOpenFiles = new Map(state.openFiles)
      newOpenFiles.set(id, newFile)
      return {
        openFiles: newOpenFiles,
        activeFileId: id,
      }
    })
    
    return id
  },
  
  closeFile: (fileId: string) => {
    set((state: EditorState) => {
      const newOpenFiles = new Map(state.openFiles)
      newOpenFiles.delete(fileId)
      
      let newActiveFileId = state.activeFileId
      if (state.activeFileId === fileId) {
        const remainingFiles = Array.from(newOpenFiles.keys())
        newActiveFileId = remainingFiles.length > 0 ? remainingFiles[0] : null
      }
      
      return {
        openFiles: newOpenFiles,
        activeFileId: newActiveFileId,
      }
    })
  },
  
  updateFileContent: (fileId: string, content: string) => {
    set((state: EditorState) => {
      const file = state.openFiles.get(fileId)
      if (!file) return state
      
      const newOpenFiles = new Map(state.openFiles)
      newOpenFiles.set(fileId, {
        ...file,
        content,
        isDirty: content !== file.originalContent,
      })
      
      return { openFiles: newOpenFiles }
    })
  },
  
  markFileSaved: (fileId: string) => {
    set((state: EditorState) => {
      const file = state.openFiles.get(fileId)
      if (!file) return state
      
      const newOpenFiles = new Map(state.openFiles)
      newOpenFiles.set(fileId, {
        ...file,
        originalContent: file.content,
        isDirty: false,
      })
      
      return { openFiles: newOpenFiles }
    })
  },
  
  getFile: (fileId: string) => {
    return get().openFiles.get(fileId)
  },
  
  hasUnsavedChanges: () => {
    return Array.from(get().openFiles.values()).some((f: EditorFile) => f.isDirty)
  },
}))

// 纯函数用于测试

/**
 * 检测文件是否有未保存的更改
 */
export function checkIsDirty(content: string, originalContent: string): boolean {
  return content !== originalContent
}

/**
 * 创建编辑器文件对象
 */
export function createEditorFile(
  id: string,
  path: string,
  content: string,
  originalContent: string
): EditorFile {
  return {
    id,
    path,
    content,
    originalContent,
    isDirty: content !== originalContent,
  }
}

/**
 * 更新文件内容并计算脏状态
 */
export function updateContent(file: EditorFile, newContent: string): EditorFile {
  return {
    ...file,
    content: newContent,
    isDirty: newContent !== file.originalContent,
  }
}
