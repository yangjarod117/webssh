import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

  const dialogContent = (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        style={{ animation: 'backdropEnter 250ms ease-out' }}
        onClick={onClose}
      />

      {/* 对话框内容 */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md mx-4 rounded-xl overflow-hidden"
        style={{ 
          zIndex: 10000,
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 14, 23, 0.99) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 212, 255, 0.1)',
          animation: 'modalEnter 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* 标题栏 */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ 
            borderColor: 'rgba(0, 212, 255, 0.15)',
            background: 'rgba(0, 212, 255, 0.05)'
          }}
        >
          <h3 className="text-lg font-medium text-text">{title}</h3>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-lg text-text-secondary 
              hover:text-error hover:bg-error/10
              transition-all duration-200
              active:scale-95
            "
            style={{ transition: 'all 200ms ease-out' }}
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

  // 使用 Portal 将对话框渲染到 body 下，避免被父元素遮挡
  return createPortal(dialogContent, document.body)
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
