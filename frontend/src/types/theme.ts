/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark'

/**
 * 终端主题配置
 */
export interface TerminalTheme {
  background: string
  foreground: string
  cursor: string
  selection: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
}

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  accent: string
  error: string
  success: string
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  id: string
  name: string
  type: ThemeType
  colors: ThemeColors
  terminal: TerminalTheme
}
