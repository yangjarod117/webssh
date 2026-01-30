import { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 * Requirements: 1.4, 3.8, 4.4, 9.7
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    
    // 调用错误回调
    this.props.onError?.(error, errorInfo)
    
    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-surface rounded-xl shadow-xl p-6 text-center"
          >
            {/* 错误图标 */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* 错误标题 */}
            <h2 className="text-xl font-semibold text-text mb-2">出错了</h2>
            
            {/* 错误描述 */}
            <p className="text-text-secondary mb-4">
              应用程序遇到了一个意外错误。请尝试刷新页面或重试操作。
            </p>

            {/* 错误详情（开发模式） */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-text-secondary hover:text-text">
                  查看错误详情
                </summary>
                <div className="mt-2 p-3 bg-background rounded-lg overflow-auto max-h-40">
                  <pre className="text-xs text-error whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-text-secondary mt-2 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-background transition-colors"
              >
                刷新页面
              </button>
            </div>
          </motion.div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 全局错误处理器
 * 用于捕获未处理的 Promise 拒绝和全局错误
 */
export function setupGlobalErrorHandlers(
  onError?: (error: Error, source: string) => void
): () => void {
  // 处理未捕获的错误
  const handleError = (event: ErrorEvent) => {
    console.error('Global error:', event.error)
    onError?.(event.error || new Error(event.message), 'window.onerror')
  }

  // 处理未处理的 Promise 拒绝
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason)
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason))
    onError?.(error, 'unhandledrejection')
  }

  window.addEventListener('error', handleError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  // 返回清理函数
  return () => {
    window.removeEventListener('error', handleError)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}

export default ErrorBoundary
