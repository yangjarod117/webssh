/**
 * 文件操作工具函数
 */

/**
 * 创建文件
 */
export async function createFile(
  sessionId: string,
  path: string
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, type: 'file' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '创建文件失败')
  }
}

/**
 * 创建文件夹
 */
export async function createDirectory(
  sessionId: string,
  path: string
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, type: 'directory' }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '创建文件夹失败')
  }
}

/**
 * 重命名文件或文件夹
 */
export async function renameFile(
  sessionId: string,
  oldPath: string,
  newPath: string
): Promise<void> {
  const response = await fetch(`/api/sessions/${sessionId}/files`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: oldPath, newPath }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '重命名失败')
  }
}

/**
 * 删除文件
 */
export async function deleteFile(
  sessionId: string,
  path: string
): Promise<void> {
  const response = await fetch(
    `/api/sessions/${sessionId}/files?path=${encodeURIComponent(path)}&type=file`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '删除文件失败')
  }
}

/**
 * 删除文件夹
 */
export async function deleteDirectory(
  sessionId: string,
  path: string
): Promise<void> {
  const response = await fetch(
    `/api/sessions/${sessionId}/files?path=${encodeURIComponent(path)}&type=directory`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '删除文件夹失败')
  }
}

/**
 * 复制路径到剪贴板
 */
export async function copyPathToClipboard(path: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(path)
  } catch {
    // 降级方案：使用 execCommand
    const textArea = document.createElement('textarea')
    textArea.value = path
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

/**
 * 检查文件是否存在
 */
export async function checkFileExists(
  sessionId: string,
  path: string
): Promise<boolean> {
  const response = await fetch(
    `/api/sessions/${sessionId}/files/exists?path=${encodeURIComponent(path)}`
  )

  if (!response.ok) {
    return false
  }

  const data = await response.json()
  return data.exists
}

/**
 * 验证文件名
 */
export function validateFileName(name: string): string | null {
  if (!name || !name.trim()) {
    return '文件名不能为空'
  }

  // 检查非法字符
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
  if (invalidChars.test(name)) {
    return '文件名包含非法字符'
  }

  // 检查保留名称（Windows）
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
  if (reservedNames.test(name)) {
    return '文件名是系统保留名称'
  }

  // 检查长度
  if (name.length > 255) {
    return '文件名过长（最多 255 个字符）'
  }

  return null
}

/**
 * 从路径中提取文件名
 */
export function getFileName(path: string): string {
  return path.split('/').pop() || ''
}

/**
 * 获取父目录路径
 */
export function getParentPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length === 0 ? '/' : '/' + parts.join('/')
}

/**
 * 拼接路径
 */
export function joinPath(basePath: string, name: string): string {
  if (basePath === '/') {
    return '/' + name
  }
  return basePath + '/' + name
}
