/**
 * 终端尺寸计算工具
 */

// 默认字符尺寸（像素）
const DEFAULT_CHAR_WIDTH = 9
const DEFAULT_CHAR_HEIGHT = 17

/**
 * 计算终端尺寸（行数和列数）
 * 
 * @param containerWidth 容器宽度（像素）
 * @param containerHeight 容器高度（像素）
 * @param charWidth 字符宽度（像素）
 * @param charHeight 字符高度（像素）
 * @returns 终端尺寸 { cols, rows }
 */
export function calculateTerminalSize(
  containerWidth: number,
  containerHeight: number,
  charWidth: number = DEFAULT_CHAR_WIDTH,
  charHeight: number = DEFAULT_CHAR_HEIGHT
): { cols: number; rows: number } {
  // 确保输入有效
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { cols: 80, rows: 24 } // 默认尺寸
  }
  
  if (charWidth <= 0 || charHeight <= 0) {
    return { cols: 80, rows: 24 }
  }
  
  // 计算列数和行数
  const cols = Math.max(1, Math.floor(containerWidth / charWidth))
  const rows = Math.max(1, Math.floor(containerHeight / charHeight))
  
  return { cols, rows }
}

/**
 * 检查终端尺寸是否有效
 */
export function isValidTerminalSize(cols: number, rows: number): boolean {
  return cols > 0 && rows > 0 && Number.isInteger(cols) && Number.isInteger(rows)
}
