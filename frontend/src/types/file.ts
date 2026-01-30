/**
 * 文件类型
 */
export type FileType = 'file' | 'directory' | 'symlink'

/**
 * 文件项
 */
export interface FileItem {
  name: string
  path: string
  type: FileType
  size: number
  modifiedTime: Date
  permissions: string
}

/**
 * 编辑器文件状态
 */
export interface EditorFile {
  id: string
  path: string
  content: string
  originalContent: string
  isDirty: boolean
}

/**
 * 文件传输进度
 */
export interface TransferProgress {
  fileName: string
  totalBytes: number
  transferredBytes: number
  percentage: number
  speed: number // bytes per second
}
