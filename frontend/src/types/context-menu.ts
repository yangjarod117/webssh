/**
 * 上下文菜单项
 */
export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}

/**
 * 上下文菜单位置
 */
export interface ContextMenuPosition {
  x: number
  y: number
}
