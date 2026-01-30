/**
 * 错误类型枚举
 */
export enum ErrorType {
  // 连接错误
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTH_FAILED = 'AUTH_FAILED',
  TIMEOUT = 'TIMEOUT',
  HOST_UNREACHABLE = 'HOST_UNREACHABLE',
  
  // 文件操作错误
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  FILE_EXISTS = 'FILE_EXISTS',
  INVALID_PATH = 'INVALID_PATH',
  
  // 网络错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  
  // 其他
  UNKNOWN = 'UNKNOWN',
}

/**
 * 错误消息映射
 */
export const errorMessages: Record<ErrorType, string> = {
  [ErrorType.CONNECTION_FAILED]: '连接失败，请检查服务器地址和端口',
  [ErrorType.AUTH_FAILED]: '认证失败，请检查用户名和密码',
  [ErrorType.TIMEOUT]: '连接超时，请检查网络连接',
  [ErrorType.HOST_UNREACHABLE]: '无法访问主机，请检查服务器是否在线',
  [ErrorType.FILE_NOT_FOUND]: '文件不存在',
  [ErrorType.PERMISSION_DENIED]: '权限不足，无法执行此操作',
  [ErrorType.DISK_FULL]: '磁盘空间不足',
  [ErrorType.FILE_EXISTS]: '文件已存在',
  [ErrorType.INVALID_PATH]: '无效的文件路径',
  [ErrorType.NETWORK_ERROR]: '网络错误，请检查网络连接',
  [ErrorType.WEBSOCKET_ERROR]: 'WebSocket 连接错误',
  [ErrorType.UNKNOWN]: '发生未知错误',
}

/**
 * 获取错误消息
 * @param errorType 错误类型
 * @returns 用户友好的错误消息
 */
export function getErrorMessage(errorType: ErrorType): string {
  // 使用 Object.prototype.hasOwnProperty 来避免原型链上的属性（如 valueOf, toString 等）
  if (Object.prototype.hasOwnProperty.call(errorMessages, errorType)) {
    return errorMessages[errorType]
  }
  return errorMessages[ErrorType.UNKNOWN]
}

/**
 * 从错误代码解析错误类型
 * @param code 错误代码字符串
 * @returns 错误类型
 */
export function parseErrorType(code: string): ErrorType {
  const upperCode = code.toUpperCase()
  
  if (upperCode.includes('AUTH') || upperCode.includes('AUTHENTICATION')) {
    return ErrorType.AUTH_FAILED
  }
  if (upperCode.includes('TIMEOUT') || upperCode.includes('TIMED_OUT')) {
    return ErrorType.TIMEOUT
  }
  if (upperCode.includes('ECONNREFUSED') || upperCode.includes('UNREACHABLE')) {
    return ErrorType.HOST_UNREACHABLE
  }
  if (upperCode.includes('ENOENT') || upperCode.includes('NOT_FOUND')) {
    return ErrorType.FILE_NOT_FOUND
  }
  if (upperCode.includes('EACCES') || upperCode.includes('PERMISSION')) {
    return ErrorType.PERMISSION_DENIED
  }
  if (upperCode.includes('ENOSPC') || upperCode.includes('DISK_FULL')) {
    return ErrorType.DISK_FULL
  }
  if (upperCode.includes('EEXIST') || upperCode.includes('EXISTS')) {
    return ErrorType.FILE_EXISTS
  }
  if (upperCode.includes('EINVAL') || upperCode.includes('INVALID')) {
    return ErrorType.INVALID_PATH
  }
  if (upperCode.includes('NETWORK') || upperCode.includes('ENOTFOUND')) {
    return ErrorType.NETWORK_ERROR
  }
  if (upperCode.includes('WEBSOCKET') || upperCode.includes('WS_')) {
    return ErrorType.WEBSOCKET_ERROR
  }
  if (upperCode.includes('CONNECTION') || upperCode.includes('CONNECT')) {
    return ErrorType.CONNECTION_FAILED
  }
  
  return ErrorType.UNKNOWN
}

/**
 * 处理 API 错误
 * @param error 错误对象
 * @returns 格式化的错误消息
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    const errorType = parseErrorType(error.message)
    return getErrorMessage(errorType)
  }
  
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string }
    if (err.code) {
      const errorType = parseErrorType(err.code)
      return getErrorMessage(errorType)
    }
    if (err.message) {
      return err.message
    }
  }
  
  return getErrorMessage(ErrorType.UNKNOWN)
}
