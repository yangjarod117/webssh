import { WebSocket, WebSocketServer } from 'ws'
import type { Server } from 'http'
import type { ClientMessage, ServerMessage } from '../types/index.js'
import { sshManager } from './ssh-manager.js'

interface WebSocketClient extends WebSocket {
  sessionId?: string
  isAlive?: boolean
}

/**
 * WebSocket 处理器
 */
export class WebSocketHandler {
  private wss: WebSocketServer
  private pingInterval: NodeJS.Timeout | null = null
  // 跟踪每个 session 对应的 WebSocket 连接
  private sessionToWs: Map<string, WebSocketClient> = new Map()
  // 跟踪已设置输出监听的 session
  private shellOutputSetup: Set<string> = new Set()
  // 跟踪正在创建 shell 的 session（防止并发创建）
  private shellCreating: Set<string> = new Set()
  // 缓冲早期 shell 输出（在 WebSocket 完全就绪之前）
  private outputBuffer: Map<string, string[]> = new Map()

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' })
    this.setupHandlers()
    this.startPingInterval()
  }

  /**
   * 设置 WebSocket 事件处理
   */
  private setupHandlers(): void {
    this.wss.on('connection', (ws: WebSocketClient) => {
      console.log('WebSocket client connected')
      ws.isAlive = true

      ws.on('pong', () => {
        ws.isAlive = true
      })

      ws.on('message', async (data) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString())
          await this.handleMessage(ws, message)
        } catch (err) {
          this.sendError(ws, 'Invalid message format')
        }
      })

      ws.on('close', () => {
        console.log('WebSocket client disconnected')
        if (ws.sessionId) {
          // 从映射中移除
          if (this.sessionToWs.get(ws.sessionId) === ws) {
            this.sessionToWs.delete(ws.sessionId)
            
            // 检查是否还有其他 WebSocket 连接到这个 session
            // 如果没有，延迟一段时间后断开 SSH 连接
            setTimeout(() => {
              if (!this.sessionToWs.has(ws.sessionId!)) {
                console.log(`[WebSocket] No active connections for session ${ws.sessionId}, disconnecting SSH`)
                sshManager.disconnect(ws.sessionId!)
                this.shellOutputSetup.delete(ws.sessionId!)
                this.shellCreating.delete(ws.sessionId!)
              }
            }, 5000) // 5秒延迟，给页面刷新留时间
          }
        }
      })

      ws.on('error', (err) => {
        console.error('WebSocket error:', err)
      })
    })
  }

  /**
   * 处理客户端消息
   */
  private async handleMessage(
    ws: WebSocketClient,
    message: ClientMessage
  ): Promise<void> {
    switch (message.type) {
      case 'input':
        await this.handleInput(ws, message)
        break
      case 'resize':
        await this.handleResize(ws, message)
        break
      case 'ping':
        this.sendMessage(ws, { type: 'pong', sessionId: message.sessionId })
        break
      default:
        this.sendError(ws, 'Unknown message type')
    }
  }

  /**
   * 处理终端输入
   */
  private async handleInput(
    ws: WebSocketClient,
    message: ClientMessage
  ): Promise<void> {
    const { sessionId, data } = message
    if (!sessionId || !data) {
      this.sendError(ws, 'Missing sessionId or data')
      return
    }

    const session = sshManager.getSession(sessionId)
    if (!session) {
      this.sendError(ws, 'Session not found', sessionId)
      return
    }

    // 绑定 WebSocket 到会话
    ws.sessionId = sessionId
    this.sessionToWs.set(sessionId, ws)

    // 如果还没有 shell，创建一个
    if (!session.shell) {
      try {
        const shell = await sshManager.createShell(sessionId)
        // 立即设置 shell 输出处理（在 shell 发送任何数据之前）
        if (shell) {
          this.setupShellOutputImmediate(sessionId, shell)
        }
      } catch (err) {
        this.sendError(ws, 'Failed to create shell', sessionId)
        return
      }
    }

    // 发送输入到终端
    const success = sshManager.sendInput(sessionId, data)
    if (!success) {
      this.sendError(ws, 'Failed to send input', sessionId)
    }
  }

  /**
   * 处理终端大小调整
   */
  private async handleResize(
    ws: WebSocketClient,
    message: ClientMessage
  ): Promise<void> {
    const { sessionId, cols, rows } = message
    if (!sessionId || !cols || !rows) {
      return // 静默忽略无效的 resize 请求
    }

    const session = sshManager.getSession(sessionId)
    if (!session) {
      return // 会话不存在，静默忽略
    }

    // 先绑定 WebSocket 到会话（在创建 shell 之前）
    ws.sessionId = sessionId
    this.sessionToWs.set(sessionId, ws)

    // 如果 shell 已存在，直接调整大小
    if (session.shell) {
      sshManager.resizeTerminal(sessionId, cols, rows)
      return
    }

    // 如果正在创建 shell，跳过
    if (this.shellCreating.has(sessionId)) {
      console.log(`[WebSocket] Shell creation already in progress for session ${sessionId}`)
      return
    }

    // 标记正在创建
    this.shellCreating.add(sessionId)

    // shell 不存在，尝试创建（带重试）
    const maxRetries = 5
    const retryDelay = 500

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // 再次检查是否已有 shell（可能在等待期间被其他请求创建了）
        const currentSession = sshManager.getSession(sessionId)
        if (currentSession?.shell) {
          console.log(`[WebSocket] Shell already exists for session ${sessionId}`)
          sshManager.resizeTerminal(sessionId, cols, rows)
          // 刷新缓冲区
          this.flushBuffer(sessionId, ws)
          return
        }

        try {
          const shell = await sshManager.createShell(sessionId, cols, rows)
          // 立即设置 shell 输出处理（在 shell 发送任何数据之前）
          if (shell) {
            this.setupShellOutputImmediate(sessionId, shell)
            console.log(`[WebSocket] Shell created successfully on attempt ${attempt}`)
            // 短暂延迟后刷新缓冲区，确保 shell 初始输出已被捕获
            setTimeout(() => this.flushBuffer(sessionId, ws), 100)
            return
          }
        } catch (err) {
          console.log(`[WebSocket] Shell creation attempt ${attempt}/${maxRetries} failed for session ${sessionId}`)
          if (attempt < maxRetries) {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          }
        }
      }
      
      console.log(`[WebSocket] All shell creation attempts failed for session ${sessionId}`)
    } finally {
      // 移除创建标记
      this.shellCreating.delete(sessionId)
    }
  }

  /**
   * 立即设置 Shell 输出处理（直接使用传入的 shell stream）
   */
  private setupShellOutputImmediate(sessionId: string, shell: NodeJS.ReadWriteStream): void {
    // 避免重复设置
    if (this.shellOutputSetup.has(sessionId)) {
      console.log(`[WebSocket] Shell output already setup for session ${sessionId}`)
      return
    }

    this.shellOutputSetup.add(sessionId)
    // 初始化输出缓冲区
    this.outputBuffer.set(sessionId, [])
    console.log(`[WebSocket] Setting up shell output immediately for session ${sessionId}`)

    shell.on('data', (data: Buffer) => {
      const dataStr = data.toString('utf-8')
      console.log(`[WebSocket] Shell data received for session ${sessionId}: ${dataStr.length} bytes, content: ${dataStr.substring(0, 100)}...`)
      
      // 动态获取当前绑定的 WebSocket
      const ws = this.sessionToWs.get(sessionId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        // 先发送缓冲区中的数据
        const buffer = this.outputBuffer.get(sessionId)
        if (buffer && buffer.length > 0) {
          console.log(`[WebSocket] Flushing ${buffer.length} buffered messages for session ${sessionId}`)
          for (const bufferedData of buffer) {
            this.sendMessage(ws, {
              type: 'output',
              sessionId,
              data: bufferedData,
            })
          }
          this.outputBuffer.set(sessionId, [])
        }
        
        console.log(`[WebSocket] Sending data to client for session ${sessionId}`)
        this.sendMessage(ws, {
          type: 'output',
          sessionId,
          data: dataStr,
        })
      } else {
        // WebSocket 未就绪，缓冲数据
        console.log(`[WebSocket] WebSocket not ready for session ${sessionId}, ws state: ${ws?.readyState}, buffering data`)
        const buffer = this.outputBuffer.get(sessionId) || []
        buffer.push(dataStr)
        this.outputBuffer.set(sessionId, buffer)
      }
    })

    shell.on('close', () => {
      console.log(`[WebSocket] Shell closed for session ${sessionId}`)
      const ws = this.sessionToWs.get(sessionId)
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, {
          type: 'disconnect',
          sessionId,
        })
      }
      // 清理
      this.shellOutputSetup.delete(sessionId)
      this.outputBuffer.delete(sessionId)
      this.sessionToWs.delete(sessionId)
    })
  }

  /**
   * 刷新缓冲区数据到 WebSocket
   */
  private flushBuffer(sessionId: string, ws: WebSocketClient): void {
    const buffer = this.outputBuffer.get(sessionId)
    if (buffer && buffer.length > 0 && ws.readyState === WebSocket.OPEN) {
      console.log(`[WebSocket] Flushing ${buffer.length} buffered messages for session ${sessionId}`)
      for (const data of buffer) {
        this.sendMessage(ws, {
          type: 'output',
          sessionId,
          data,
        })
      }
      this.outputBuffer.set(sessionId, [])
    }
  }

  /**
   * 发送消息到客户端
   */
  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * 发送错误消息
   */
  private sendError(ws: WebSocket, error: string, sessionId = ''): void {
    this.sendMessage(ws, {
      type: 'error',
      sessionId,
      error,
    })
  }

  /**
   * 启动心跳检测
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) {
          return ws.terminate()
        }
        ws.isAlive = false
        ws.ping()
      })
    }, 30000)
  }

  /**
   * 广播消息到所有连接的客户端
   */
  broadcast(message: ServerMessage): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message))
      }
    })
  }

  /**
   * 关闭 WebSocket 服务
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    this.wss.close()
  }
}
