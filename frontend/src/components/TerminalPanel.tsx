import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { useThemeStore } from '../store'
import { calculateTerminalSize } from '../utils/terminal'
import type { TerminalTheme } from '../types'
import 'xterm/css/xterm.css'

// 全局终端实例存储，防止组件重新挂载时丢失终端
const globalTerminals = new Map<string, {
  terminal: Terminal
  fitAddon: FitAddon
  ws: WebSocket | null
  buffer: string[] // 存储终端输出历史
}>()

interface TerminalPanelProps {
  sessionId: string
  isActive?: boolean
  onResize?: (cols: number, rows: number) => void
  onData?: (data: string) => void
  onWsReady?: (ws: WebSocket) => void
}

/**
 * 将主题配置转换为 xterm 主题格式
 */
function convertToXtermTheme(terminalTheme: TerminalTheme) {
  return {
    background: terminalTheme.background,
    foreground: terminalTheme.foreground,
    cursor: terminalTheme.cursor,
    cursorAccent: terminalTheme.background,
    selectionBackground: terminalTheme.selection,
    selectionForeground: terminalTheme.foreground,
    black: terminalTheme.black,
    red: terminalTheme.red,
    green: terminalTheme.green,
    yellow: terminalTheme.yellow,
    blue: terminalTheme.blue,
    magenta: terminalTheme.magenta,
    cyan: terminalTheme.cyan,
    white: terminalTheme.white,
    // Bright colors (slightly lighter versions)
    brightBlack: terminalTheme.black,
    brightRed: terminalTheme.red,
    brightGreen: terminalTheme.green,
    brightYellow: terminalTheme.yellow,
    brightBlue: terminalTheme.blue,
    brightMagenta: terminalTheme.magenta,
    brightCyan: terminalTheme.cyan,
    brightWhite: terminalTheme.white,
  }
}

/**
 * 终端面板组件
 */
export function TerminalPanel({ sessionId, isActive = true, onResize, onData, onWsReady }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [copyHint, setCopyHint] = useState<string | null>(null)
  const { getCurrentTheme, terminalFontSize, getTerminalFontFamily } = useThemeStore()
  const theme = getCurrentTheme()
  const terminalFontFamily = getTerminalFontFamily()

  // 右键复制/粘贴功能
  const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const terminal = xtermRef.current
    const ws = wsRef.current
    if (!terminal) return

    const selection = terminal.getSelection()

    // 如果有选中内容，执行复制
    if (selection && selection.length > 0) {
      try {
        await navigator.clipboard.writeText(selection)
        terminal.clearSelection()
        setCopyHint('已复制')
        setTimeout(() => setCopyHint(null), 1000)
      } catch {
        setCopyHint('复制失败')
        setTimeout(() => setCopyHint(null), 1000)
      }
    } else {
      // 没有选中内容，执行粘贴
      try {
        const text = await navigator.clipboard.readText()
        if (text && ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'input',
            sessionId,
            data: text,
          }))
          setCopyHint('已粘贴')
          setTimeout(() => setCopyHint(null), 1000)
        } else if (!text) {
          setCopyHint('剪贴板为空')
          setTimeout(() => setCopyHint(null), 1000)
        }
      } catch (err) {
        console.error('粘贴失败:', err)
        setCopyHint('粘贴失败')
        setTimeout(() => setCopyHint(null), 1000)
      }
    }
  }, [sessionId])

  // 初始化终端 - 使用全局存储防止重新挂载时丢失
  useEffect(() => {
    if (!terminalRef.current) {
      console.log(`[TerminalPanel] terminalRef.current is null for sessionId: ${sessionId}`)
      return
    }

    // 检查是否已有该 session 的终端实例
    let terminalData = globalTerminals.get(sessionId)
    
    if (terminalData) {
      // 已有终端实例，重新附加到 DOM
      console.log(`[TerminalPanel] Reattaching existing terminal for sessionId: ${sessionId}`)
      
      // 清空容器
      terminalRef.current.innerHTML = ''
      
      // 重新打开终端到新容器
      terminalData.terminal.open(terminalRef.current)
      
      // 延迟执行 fit，确保 DOM 已更新
      setTimeout(() => {
        try {
          terminalData!.fitAddon.fit()
        } catch (e) {
          console.warn('fit error on reattach:', e)
        }
      }, 100)
      
      xtermRef.current = terminalData.terminal
      fitAddonRef.current = terminalData.fitAddon
      wsRef.current = terminalData.ws
      
      return // 不需要清理，因为终端实例是全局的
    }

    // 创建新终端实例
    console.log(`[TerminalPanel] Creating new Terminal for sessionId: ${sessionId}`)
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      cursorInactiveStyle: 'outline',
      fontSize: terminalFontSize,
      fontFamily: terminalFontFamily,
      theme: convertToXtermTheme(theme.terminal),
      allowTransparency: true,
      scrollback: 10000,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(terminalRef.current)
    
    // 延迟执行 fit
    setTimeout(() => {
      try {
        fitAddon.fit()
      } catch (e) {
        console.warn('fit error:', e)
      }
    }, 100)

    // 存储到全局
    globalTerminals.set(sessionId, {
      terminal,
      fitAddon,
      ws: null,
      buffer: [],
    })

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // 处理终端输入
    terminal.onData((data) => {
      if (onData) {
        onData(data)
      }
      // 发送到 WebSocket
      const termData = globalTerminals.get(sessionId)
      if (termData?.ws?.readyState === WebSocket.OPEN) {
        termData.ws.send(JSON.stringify({
          type: 'input',
          sessionId,
          data,
        }))
      }
    })

    // 处理 Ctrl+V 粘贴
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
        navigator.clipboard.readText().then((text) => {
          const termData = globalTerminals.get(sessionId)
          if (text && termData?.ws?.readyState === WebSocket.OPEN) {
            termData.ws.send(JSON.stringify({
              type: 'input',
              sessionId,
              data: text,
            }))
          }
        }).catch(() => {})
        return false // 阻止默认行为
      }
      return true
    })

    // 处理终端大小变化
    terminal.onResize(({ cols, rows }) => {
      if (onResize) {
        onResize(cols, rows)
      }
      // 发送到 WebSocket
      const termData = globalTerminals.get(sessionId)
      if (termData?.ws?.readyState === WebSocket.OPEN) {
        termData.ws.send(JSON.stringify({
          type: 'resize',
          sessionId,
          cols,
          rows,
        }))
      }
    })

    // 组件卸载时不销毁终端，保留在全局存储中
    return () => {
      console.log(`[TerminalPanel] Component unmounting for sessionId: ${sessionId}, keeping terminal alive`)
      // 不调用 terminal.dispose()，保留终端实例
    }
  }, [sessionId])

  // 更新主题
  useEffect(() => {
    if (!xtermRef.current) return

    xtermRef.current.options.theme = convertToXtermTheme(theme.terminal)
  }, [theme])

  // 更新字体大小
  useEffect(() => {
    if (!xtermRef.current) return

    xtermRef.current.options.fontSize = terminalFontSize
    // 重新适配终端大小
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  }, [terminalFontSize])

  // 更新终端字体
  useEffect(() => {
    if (!xtermRef.current) return

    xtermRef.current.options.fontFamily = terminalFontFamily
    // 重新适配终端大小
    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  }, [terminalFontFamily])

  // 连接 WebSocket（带心跳和自动重连）
  useEffect(() => {
    // 检查是否已有 WebSocket 连接
    const existingData = globalTerminals.get(sessionId)
    if (existingData?.ws?.readyState === WebSocket.OPEN) {
      console.log(`[TerminalPanel] Reusing existing WebSocket for sessionId: ${sessionId}`)
      wsRef.current = existingData.ws
      onWsReady?.(existingData.ws)
      return
    }

    let ws: WebSocket | null = null
    let pingInterval: ReturnType<typeof setInterval> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let hasReceivedOutput = false // 只有收到终端输出才算真正连接成功
    const maxReconnectAttempts = 5
    const reconnectDelay = 3000

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws`
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        reconnectAttempts = 0
        
        // 更新全局存储中的 ws
        const termData = globalTerminals.get(sessionId)
        if (termData) {
          termData.ws = ws
        }
        
        // 发送初始大小
        if (fitAddonRef.current && xtermRef.current) {
          const { cols, rows } = xtermRef.current
          ws?.send(JSON.stringify({
            type: 'resize',
            sessionId,
            cols,
            rows,
          }))
        }

        // 启动心跳
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', sessionId }))
          }
        }, 25000) // 每25秒发送一次心跳

        // 通知父组件 WebSocket 已就绪
        if (ws) {
          onWsReady?.(ws)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          // 处理 pong 响应（心跳确认）
          if (message.type === 'pong') return
          
          if (message.sessionId !== sessionId) return

          switch (message.type) {
            case 'output':
              hasReceivedOutput = true // 收到输出才算真正连接成功
              xtermRef.current?.write(message.data || '')
              break
            case 'error':
              // 忽略 resize 相关的错误，不显示给用户
              if (!message.error?.includes('resize')) {
                xtermRef.current?.write(`\r\n\x1b[31mError: ${message.error}\x1b[0m\r\n`)
              }
              break
            case 'disconnect':
              if (hasReceivedOutput) {
                xtermRef.current?.write('\r\n\x1b[33m连接已关闭\x1b[0m\r\n')
              }
              break
          }
        } catch {
          // 忽略解析错误
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        
        // 更新全局存储
        const termData = globalTerminals.get(sessionId)
        if (termData) {
          termData.ws = null
        }
        
        // 清理心跳
        if (pingInterval) {
          clearInterval(pingInterval)
          pingInterval = null
        }

        // 只有在收到过终端输出后断开才显示重连提示
        if (hasReceivedOutput && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`)
          xtermRef.current?.write(`\r\n\x1b[33m连接断开，正在重连 (${reconnectAttempts}/${maxReconnectAttempts})...\x1b[0m\r\n`)
          reconnectTimeout = setTimeout(connect, reconnectDelay)
        } else if (hasReceivedOutput) {
          xtermRef.current?.write('\r\n\x1b[31m连接失败，请刷新页面重试\x1b[0m\r\n')
        }
        // 首次连接失败不显示任何提示，静默重试
        else if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          reconnectTimeout = setTimeout(connect, reconnectDelay)
        }
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (pingInterval) clearInterval(pingInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      // 不关闭 WebSocket，保持连接
    }
  }, [sessionId])

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      // 使用 requestAnimationFrame 确保在布局更新后执行
      requestAnimationFrame(() => {
        fitAddonRef.current?.fit()
      })
    }
  }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    
    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
    }
  }, [handleResize])

  // 聚焦终端
  const focus = useCallback(() => {
    xtermRef.current?.focus()
  }, [])

  // 当终端激活时自动聚焦和刷新
  useEffect(() => {
    if (isActive && xtermRef.current) {
      // 使用多次延迟确保终端正确恢复
      const timer1 = setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit()
          } catch (e) {
            console.warn('fit error:', e)
          }
        }
      }, 50)
      
      const timer2 = setTimeout(() => {
        if (xtermRef.current) {
          try {
            // 强制刷新整个终端缓冲区
            const rows = xtermRef.current.rows
            xtermRef.current.refresh(0, rows - 1)
            xtermRef.current.focus()
          } catch (e) {
            console.warn('refresh error:', e)
          }
        }
      }, 150)
      
      const timer3 = setTimeout(() => {
        if (xtermRef.current && fitAddonRef.current) {
          try {
            // 再次适配大小并刷新，确保显示正确
            fitAddonRef.current.fit()
            const rows = xtermRef.current.rows
            xtermRef.current.refresh(0, rows - 1)
            // 滚动到底部
            xtermRef.current.scrollToBottom()
          } catch (e) {
            console.warn('final refresh error:', e)
          }
        }
      }, 300)
      
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }
  }, [isActive])

  return (
    <div
      ref={terminalRef}
      className="w-full h-full relative"
      style={{ backgroundColor: theme.terminal.background }}
      onClick={focus}
      onContextMenu={handleContextMenu}
    >
      {/* 复制/粘贴提示 */}
      {copyHint && (
        <div className="absolute top-2 right-2 px-3 py-1 bg-surface/90 text-white text-sm rounded shadow-lg z-10">
          {copyHint}
        </div>
      )}
    </div>
  )
}

// 导出工具函数供测试使用
export { calculateTerminalSize }

// 清理指定会话的终端（当会话真正关闭时调用）
export function cleanupTerminal(sessionId: string) {
  const termData = globalTerminals.get(sessionId)
  if (termData) {
    console.log(`[TerminalPanel] Cleaning up terminal for sessionId: ${sessionId}`)
    termData.ws?.close()
    termData.terminal.dispose()
    globalTerminals.delete(sessionId)
  }
}
