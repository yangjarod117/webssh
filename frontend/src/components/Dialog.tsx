import { useEffect, useRef, useState } from 'react'

/**
 * 对话框基础组件属性
 */
export interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

/**
 * 对话框基础组件
 * Requirements: 8.1, 8.2 - 现代化 UI 设计和平滑动画
 */
export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
      />

      {/* 对话框内容 */}
      <div
        ref={dialogRef}
        className="
          relative z-10 w-full max-w-md mx-4
          bg-surface border border-border rounded-theme-xl shadow-theme-xl
          modal-content-enter
        "
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-lg font-medium text-text">{title}</h3>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-theme-md text-text-secondary 
              hover:text-text hover:bg-surface-hover
              transition-all duration-fast
              active:scale-95
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * 确认对话框属性
 */
export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  isLoading?: boolean
}

/**
 * 确认对话框组件
 * Requirements: 8.1, 8.2 - 现代化 UI 设计和平滑动画
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        >
          {isLoading ? (
            <>
              <span className="spinner w-4 h-4" />
              处理中...
            </>
          ) : confirmText}
        </button>
      </div>
    </Dialog>
  )
}

/**
 * 输入对话框属性
 */
export interface InputDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  validator?: (value: string) => string | null
}

/**
 * 输入对话框组件
 * Requirements: 8.1, 8.2 - 现代化 UI 设计和平滑动画
 */
export function InputDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  placeholder = '',
  defaultValue = '',
  confirmText = '确认',
  cancelText = '取消',
  isLoading = false,
  validator,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      setError(null)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, defaultValue])

  const handleConfirm = () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      setError('请输入内容')
      return
    }

    if (validator) {
      const validationError = validator(trimmedValue)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    onConfirm(trimmedValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mb-4">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isLoading}
          className={`input ${error ? 'input-error' : ''}`}
        />
        {error && (
          <p className="mt-2 text-sm text-error animate-fade-in">{error}</p>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading || !value.trim()}
          className="btn btn-primary"
        >
          {isLoading ? (
            <>
              <span className="spinner w-4 h-4" />
              处理中...
            </>
          ) : confirmText}
        </button>
      </div>
    </Dialog>
  )
}
