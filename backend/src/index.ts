import express from 'express'
import cors from 'cors'
import path from 'path'
import { createServer } from 'http'
import { WebSocketHandler } from './services/websocket-handler'
import { sshManager } from './services/ssh-manager'
import sessionsRouter from './routes/sessions'
import filesRouter from './routes/files'
import { errorHandler, notFoundHandler } from './middleware/error-handler'

const app = express()
const PORT = process.env.PORT || 4000

// Middleware
app.use(cors())
app.use(express.json())

// 生产环境提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public')
  app.use(express.static(publicPath))
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/sessions', sessionsRouter)
app.use('/api/sessions', filesRouter)

// 生产环境 SPA 路由回退
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })
}

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Create HTTP server
const server = createServer(app)

// Create WebSocket handler
const wsHandler = new WebSocketHandler(server)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  wsHandler.shutdown()
  sshManager.shutdown()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  wsHandler.shutdown()
  sshManager.shutdown()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export { app, server, wsHandler }
