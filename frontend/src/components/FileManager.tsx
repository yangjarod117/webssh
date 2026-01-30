import { useState, useCallback } from 'react'
import { FileExplorer } from './FileExplorer'
import { ContextMenu, generateContextMenuItems } from './ContextMenu'
import { ConfirmDialog, InputDialog } from './Dialog'
import {
  createFile,
  createDirectory,
  renameFile,
  deleteFile,
  deleteDirectory,
  copyPathToClipboard,
  validateFileName,
  getParentPath,
  joinPath,
} from '../utils/file-operations'
import type { FileItem, ContextMenuPosition } from '../types'

/**
 * 文件管理器属性
 */
export interface FileManagerProps {
  sessionId: string
  onFileOpen?: (file: FileItem) => void
  onFileEdit?: (file: FileItem) => void
  onUploadRequest?: (targetPath: string) => void
  onDownloadRequest?: (file: FileItem) => void
}

/**
 * 文件管理器组件
 * 集成文件浏览、上下文菜单和文件操作功能
 */
export function FileManager({
  sessionId,
  onFileOpen,
  onFileEdit,
  onUploadRequest,
  onDownloadRequest,
}: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // 上下文菜单状态
  const [contextMenu, setContextMenu] = useState<{
    file: FileItem
    position: ContextMenuPosition
  } | null>(null)

  // 对话框状态
  const [newFileDialog, setNewFileDialog] = useState(false)
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [renameDialog, setRenameDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 刷新文件列表
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // 显示提示消息
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // 处理上下文菜单
  const handleContextMenu = (file: FileItem, position: ContextMenuPosition) => {
    setSelectedFile(file)
    setContextMenu({ file, position })
  }

  // 关闭上下文菜单
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // 处理打开
  const handleOpen = () => {
    if (!selectedFile) return
    if (selectedFile.type === 'directory') {
      setCurrentPath(selectedFile.path)
    } else {
      onFileOpen?.(selectedFile)
    }
    closeContextMenu()
  }

  // 处理编辑
  const handleEdit = () => {
    if (!selectedFile) return
    onFileEdit?.(selectedFile)
    closeContextMenu()
  }

  // 处理新建文件
  const handleNewFile = async (name: string) => {
    setIsLoading(true)
    try {
      const targetPath = selectedFile?.type === 'directory'
        ? selectedFile.path
        : currentPath
      const filePath = joinPath(targetPath, name)
      await createFile(sessionId, filePath)
      showToast('success', '文件创建成功')
      refresh()
      setNewFileDialog(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '创建文件失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理新建文件夹
  const handleNewFolder = async (name: string) => {
    setIsLoading(true)
    try {
      const targetPath = selectedFile?.type === 'directory'
        ? selectedFile.path
        : currentPath
      const folderPath = joinPath(targetPath, name)
      await createDirectory(sessionId, folderPath)
      showToast('success', '文件夹创建成功')
      refresh()
      setNewFolderDialog(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '创建文件夹失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理重命名
  const handleRename = async (newName: string) => {
    if (!selectedFile) return
    setIsLoading(true)
    try {
      const parentPath = getParentPath(selectedFile.path)
      const newPath = joinPath(parentPath, newName)
      await renameFile(sessionId, selectedFile.path, newPath)
      showToast('success', '重命名成功')
      refresh()
      setRenameDialog(false)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '重命名失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理删除
  const handleDelete = async () => {
    if (!selectedFile) return
    setIsLoading(true)
    try {
      if (selectedFile.type === 'directory') {
        await deleteDirectory(sessionId, selectedFile.path)
      } else {
        await deleteFile(sessionId, selectedFile.path)
      }
      showToast('success', '删除成功')
      refresh()
      setDeleteDialog(false)
      setSelectedFile(null)
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '删除失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 处理复制路径
  const handleCopyPath = async () => {
    if (!selectedFile) return
    try {
      await copyPathToClipboard(selectedFile.path)
      showToast('success', '路径已复制到剪贴板')
    } catch {
      showToast('error', '复制路径失败')
    }
    closeContextMenu()
  }

  // 处理下载
  const handleDownload = () => {
    if (!selectedFile) return
    onDownloadRequest?.(selectedFile)
    closeContextMenu()
  }

  // 处理上传
  const handleUpload = () => {
    const targetPath = selectedFile?.type === 'directory'
      ? selectedFile.path
      : currentPath
    onUploadRequest?.(targetPath)
    closeContextMenu()
  }

  // 生成上下文菜单项
  const menuItems = contextMenu
    ? generateContextMenuItems({
        file: contextMenu.file,
        onOpen: handleOpen,
        onEdit: handleEdit,
        onRename: () => {
          setRenameDialog(true)
          closeContextMenu()
        },
        onDelete: () => {
          setDeleteDialog(true)
          closeContextMenu()
        },
        onCopyPath: handleCopyPath,
        onDownload: handleDownload,
        onUpload: handleUpload,
        onNewFile: () => {
          setNewFileDialog(true)
          closeContextMenu()
        },
        onNewFolder: () => {
          setNewFolderDialog(true)
          closeContextMenu()
        },
      })
    : []

  return (
    <div className="relative h-full">
      {/* 文件浏览器 */}
      <FileExplorer
        key={refreshKey}
        sessionId={sessionId}
        currentPath={currentPath}
        onPathChange={setCurrentPath}
        onFileSelect={setSelectedFile}
        onFileDoubleClick={(file) => {
          if (file.type === 'directory') {
            setCurrentPath(file.path)
          } else {
            onFileEdit?.(file)
          }
        }}
        onContextMenu={handleContextMenu}
      />

      {/* 上下文菜单 */}
      {contextMenu && (
        <ContextMenu
          items={menuItems}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}

      {/* 新建文件对话框 */}
      <InputDialog
        isOpen={newFileDialog}
        onClose={() => setNewFileDialog(false)}
        onConfirm={handleNewFile}
        title="新建文件"
        placeholder="请输入文件名"
        confirmText="创建"
        isLoading={isLoading}
        validator={validateFileName}
      />

      {/* 新建文件夹对话框 */}
      <InputDialog
        isOpen={newFolderDialog}
        onClose={() => setNewFolderDialog(false)}
        onConfirm={handleNewFolder}
        title="新建文件夹"
        placeholder="请输入文件夹名"
        confirmText="创建"
        isLoading={isLoading}
        validator={validateFileName}
      />

      {/* 重命名对话框 */}
      <InputDialog
        isOpen={renameDialog}
        onClose={() => setRenameDialog(false)}
        onConfirm={handleRename}
        title="重命名"
        placeholder="请输入新名称"
        defaultValue={selectedFile?.name || ''}
        confirmText="重命名"
        isLoading={isLoading}
        validator={validateFileName}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleDelete}
        title="确认删除"
        message={`确定要删除 "${selectedFile?.name}" 吗？此操作无法撤销。`}
        confirmText="删除"
        danger
        isLoading={isLoading}
      />

      {/* Toast 提示 */}
      {toast && (
        <div
          className={`
            fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
            animate-slide-in
            ${toast.type === 'success' ? 'bg-success' : 'bg-error'}
            text-white text-sm
          `}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
