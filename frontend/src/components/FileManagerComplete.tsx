import { useState, useCallback, useRef, useEffect } from 'react'
import { FileExplorer } from './FileExplorer'
import { ContextMenu, generateContextMenuItems } from './ContextMenu'
import { ConfirmDialog, InputDialog } from './Dialog'
import { FileConflictDialog } from './FileConflictDialog'
import {
  calculateTransferProgress,
  detectFileConflict,
  downloadFile,
} from './FileTransfer'
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
import type { FileItem, ContextMenuPosition, TransferProgress } from '../types'

/**
 * 完整文件管理器属性
 */
export interface FileManagerCompleteProps {
  sessionId: string
  onFileOpen?: (file: FileItem) => void
  onFileEdit?: (file: FileItem) => void
  onOpenTerminalInDir?: (path: string) => void
}

/**
 * 完整文件管理器组件
 * 集成文件浏览、上下文菜单、文件操作、上传下载和冲突处理
 */
export function FileManagerComplete({
  sessionId,
  onFileOpen,
  onFileEdit,
  onOpenTerminalInDir,
}: FileManagerCompleteProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
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

  // 上传状态
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<TransferProgress[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 冲突处理状态
  const [conflictDialog, setConflictDialog] = useState<{
    fileName: string
    onOverwrite: () => void
    onSkip: () => void
  } | null>(null)

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/files?path=${encodeURIComponent(currentPath)}`
      )
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    }
  }, [sessionId, currentPath])

  useEffect(() => {
    loadFiles()
  }, [loadFiles, refreshKey])

  // 刷新文件列表
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // 显示提示消息
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  // 上传单个文件
  const uploadFile = useCallback(
    async (file: File, targetPath: string, overwrite: boolean = false): Promise<boolean> => {
      // 检测冲突
      if (!overwrite && detectFileConflict(files, file.name)) {
        return new Promise((resolve) => {
          setConflictDialog({
            fileName: file.name,
            onOverwrite: async () => {
              setConflictDialog(null)
              const result = await uploadFile(file, targetPath, true)
              resolve(result)
            },
            onSkip: () => {
              setConflictDialog(null)
              resolve(false)
            },
          })
        })
      }

      const progress: TransferProgress = {
        fileName: file.name,
        totalBytes: file.size,
        transferredBytes: 0,
        percentage: 0,
        speed: 0,
      }

      setUploads((prev) => [...prev, progress])

      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', targetPath)

      const startTime = Date.now()

      try {
        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const elapsed = (Date.now() - startTime) / 1000
            const speed = elapsed > 0 ? e.loaded / elapsed : 0

            setUploads((prev) =>
              prev.map((p) =>
                p.fileName === file.name
                  ? {
                      ...p,
                      transferredBytes: e.loaded,
                      percentage: calculateTransferProgress(e.loaded, e.total),
                      speed,
                    }
                  : p
              )
            )
          }
        }

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`上传失败: ${xhr.statusText}`))
            }
          }
          xhr.onerror = () => reject(new Error('网络错误'))
          xhr.open('POST', `/api/sessions/${sessionId}/files/upload`)
          xhr.send(formData)
        })

        // 上传完成，移除进度
        setTimeout(() => {
          setUploads((prev) => prev.filter((p) => p.fileName !== file.name))
        }, 1000)

        return true
      } catch (error) {
        console.error('Upload error:', error)
        setUploads((prev) => prev.filter((p) => p.fileName !== file.name))
        showToast('error', `上传 ${file.name} 失败`)
        return false
      }
    },
    [sessionId, files]
  )

  // 处理文件选择上传
  const handleFileSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return

    const targetPath = selectedFile?.type === 'directory'
      ? selectedFile.path
      : currentPath

    let successCount = 0
    for (const file of Array.from(fileList)) {
      const success = await uploadFile(file, targetPath)
      if (success) successCount++
    }

    if (successCount > 0) {
      showToast('success', `成功上传 ${successCount} 个文件`)
      refresh()
    }
  }

  // 拖拽事件处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 只有当离开整个容器时才设置为 false
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const fileList = e.dataTransfer.files
    await handleFileSelect(fileList)
  }

  // 处理下载
  const handleDownload = async () => {
    if (!selectedFile || selectedFile.type === 'directory') return
    try {
      await downloadFile(sessionId, selectedFile)
      showToast('success', '下载已开始')
    } catch {
      showToast('error', '下载失败')
    }
    closeContextMenu()
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

  // 处理上传按钮点击
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // 处理在目录中打开终端
  const handleOpenTerminal = () => {
    if (!selectedFile || selectedFile.type !== 'directory') return
    onOpenTerminalInDir?.(selectedFile.path)
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
        onUpload: handleUploadClick,
        onNewFile: () => {
          setNewFileDialog(true)
          closeContextMenu()
        },
        onNewFolder: () => {
          setNewFolderDialog(true)
          closeContextMenu()
        },
        onOpenTerminal: handleOpenTerminal,
      })
    : []

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  // 格式化速度
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }

  return (
    <div
      className="relative h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

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

      {/* 拖拽覆盖层 */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg text-white">释放文件以上传</p>
          </div>
        </div>
      )}

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

      {/* 文件冲突对话框 */}
      {conflictDialog && (
        <FileConflictDialog
          isOpen={true}
          fileName={conflictDialog.fileName}
          onOverwrite={conflictDialog.onOverwrite}
          onSkip={conflictDialog.onSkip}
          onCancel={() => {
            conflictDialog.onSkip()
            setConflictDialog(null)
          }}
        />
      )}

      {/* 上传进度列表 */}
      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-surface/50">
            <span className="text-sm font-medium text-white">上传中 ({uploads.length})</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {uploads.map((upload) => (
              <div key={upload.fileName} className="px-3 py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate flex-1 mr-2">{upload.fileName}</span>
                  <span className="text-xs text-secondary">{upload.percentage}%</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${upload.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-secondary">
                  <span>{formatSize(upload.transferredBytes)} / {formatSize(upload.totalBytes)}</span>
                  <span>{formatSpeed(upload.speed)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast && (
        <div
          className={`
            fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg
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
