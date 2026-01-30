import { useState, useRef, useCallback } from 'react'
import type { TransferProgress, FileItem } from '../types'

/**
 * 计算传输进度百分比
 */
export function calculateTransferProgress(
  transferredBytes: number,
  totalBytes: number
): number {
  if (totalBytes <= 0) return 0
  const percentage = (transferredBytes / totalBytes) * 100
  return Math.min(100, Math.max(0, Math.round(percentage * 10) / 10))
}

/**
 * 检测文件冲突
 */
export function detectFileConflict(
  existingFiles: FileItem[],
  uploadFileName: string
): boolean {
  return existingFiles.some(
    (file) => file.name.toLowerCase() === uploadFileName.toLowerCase()
  )
}

/**
 * 格式化传输速度
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }
}

/**
 * 上传区域属性
 */
export interface UploadAreaProps {
  sessionId: string
  targetPath: string
  existingFiles: FileItem[]
  onUploadComplete: () => void
  onConflict: (fileName: string, onConfirm: () => void) => void
}

/**
 * 上传区域组件
 */
export function UploadArea({
  sessionId,
  targetPath,
  existingFiles,
  onUploadComplete,
  onConflict,
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploads, setUploads] = useState<TransferProgress[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 上传单个文件
  const uploadFile = useCallback(
    async (file: File, overwrite: boolean = false) => {
      // 检测冲突
      if (!overwrite && detectFileConflict(existingFiles, file.name)) {
        return new Promise<void>((resolve) => {
          onConflict(file.name, async () => {
            await uploadFile(file, true)
            resolve()
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

        onUploadComplete()
      } catch (error) {
        console.error('Upload error:', error)
        setUploads((prev) => prev.filter((p) => p.fileName !== file.name))
        throw error
      }
    },
    [sessionId, targetPath, existingFiles, onConflict, onUploadComplete]
  )

  // 处理文件选择
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      try {
        await uploadFile(file)
      } catch (error) {
        console.error('Failed to upload:', file.name, error)
      }
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
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    await handleFileSelect(files)
  }

  // 点击上传按钮
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="relative">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* 上传按钮 */}
      <button
        onClick={handleUploadClick}
        className="
          flex items-center gap-2 px-3 py-1.5 rounded text-sm
          bg-primary hover:bg-primary/80 text-white
          transition-colors duration-150
        "
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        上传文件
      </button>

      {/* 拖拽区域覆盖层 */}
      {isDragging && (
        <div
          className="
            fixed inset-0 z-40 bg-primary/20 border-2 border-dashed border-primary
            flex items-center justify-center
          "
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-primary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg text-white">释放文件以上传</p>
          </div>
        </div>
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

      {/* 全局拖拽监听 */}
      <div
        className="fixed inset-0 z-30 pointer-events-none"
        onDragEnter={handleDragEnter}
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
      />
    </div>
  )
}


/**
 * 下载文件
 */
export async function downloadFile(sessionId: string, file: FileItem): Promise<void> {
  const url = `/api/sessions/${sessionId}/files/download?path=${encodeURIComponent(file.path)}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('下载失败')
    }

    const blob = await response.blob()
    const downloadUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(downloadUrl)
  } catch (error) {
    console.error('Download error:', error)
    throw error
  }
}

/**
 * 下载进度组件属性
 */
export interface DownloadProgressProps {
  downloads: TransferProgress[]
}

/**
 * 下载进度组件
 */
export function DownloadProgress({ downloads }: DownloadProgressProps) {
  if (downloads.length === 0) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 bg-surface border border-border rounded-lg shadow-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-surface/50">
        <span className="text-sm font-medium text-white">下载中 ({downloads.length})</span>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {downloads.map((download) => (
          <div key={download.fileName} className="px-3 py-2 border-b border-border/30 last:border-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white truncate flex-1 mr-2">{download.fileName}</span>
              <span className="text-xs text-secondary">{download.percentage}%</span>
            </div>
            <div className="h-1.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${download.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-secondary">
              <span>{formatSize(download.transferredBytes)} / {formatSize(download.totalBytes)}</span>
              <span>{formatSpeed(download.speed)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
