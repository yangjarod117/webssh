import { Dialog } from './Dialog'

/**
 * 文件冲突对话框属性
 */
export interface FileConflictDialogProps {
  isOpen: boolean
  fileName: string
  onOverwrite: () => void
  onSkip: () => void
  onCancel: () => void
}

/**
 * 文件冲突对话框组件
 */
export function FileConflictDialog({
  isOpen,
  fileName,
  onOverwrite,
  onSkip,
  onCancel,
}: FileConflictDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onCancel} title="文件已存在">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">文件冲突</p>
            <p className="text-secondary text-sm">目标位置已存在同名文件</p>
          </div>
        </div>
        <div className="bg-background rounded-lg px-4 py-3 border border-border">
          <p className="text-sm text-secondary mb-1">文件名</p>
          <p className="text-white font-mono text-sm truncate">{fileName}</p>
        </div>
        <p className="text-secondary text-sm mt-4">
          请选择如何处理此冲突：
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onOverwrite}
          className="
            w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-error/10 hover:bg-error/20 border border-error/30
            text-error transition-colors duration-150
          "
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div className="text-left">
            <p className="font-medium">覆盖</p>
            <p className="text-xs text-error/70">替换现有文件</p>
          </div>
        </button>

        <button
          onClick={onSkip}
          className="
            w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-surface hover:bg-surface/80 border border-border
            text-secondary hover:text-white transition-colors duration-150
          "
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <div className="text-left">
            <p className="font-medium">跳过</p>
            <p className="text-xs text-secondary/70">保留现有文件，不上传</p>
          </div>
        </button>

        <button
          onClick={onCancel}
          className="
            w-full flex items-center gap-3 px-4 py-3 rounded-lg
            bg-surface hover:bg-surface/80 border border-border
            text-secondary hover:text-white transition-colors duration-150
          "
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div className="text-left">
            <p className="font-medium">取消</p>
            <p className="text-xs text-secondary/70">取消上传操作</p>
          </div>
        </button>
      </div>
    </Dialog>
  )
}
