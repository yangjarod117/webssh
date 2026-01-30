/**
 * 分栏布局状态
 */
export interface SplitLayoutState {
  ratio: number // 0.1 - 0.9
  isCollapsed: boolean
  collapsedRatio: number // 折叠前的比例
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  theme: string
  followSystemTheme: boolean
  splitRatio: number
  terminalFontSize: number
  editorFontSize: number
  logMaxSize: number
}
