import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '../store'

interface ThemeProviderProps {
  children: ReactNode
}

/**
 * 主题提供者组件
 * 负责应用主题到 DOM 和监听系统主题变化
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { getCurrentTheme, followSystemTheme, setTheme } = useThemeStore()
  const theme = getCurrentTheme()

  // 应用主题到 DOM
  useEffect(() => {
    const root = document.documentElement

    // 设置主题类
    if (theme.type === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    // 设置 CSS 变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value)
    })

    // 设置终端主题变量
    Object.entries(theme.terminal).forEach(([key, value]) => {
      root.style.setProperty(`--terminal-${key}`, value)
    })
  }, [theme])

  // 监听系统主题变化
  useEffect(() => {
    if (!followSystemTheme) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [followSystemTheme, setTheme])

  return <>{children}</>
}
