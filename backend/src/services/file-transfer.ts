import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { sshManager } from './ssh-manager.js'

/**
 * 传输进度回调
 */
export type ProgressCallback = (transferred: number, total: number) => void

/**
 * 文件传输管理器
 */
export class FileTransferManager {
  /**
   * 上传文件到远程服务器
   */
  async uploadFile(
    sessionId: string,
    localPath: string,
    remotePath: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      const readStream = createReadStream(localPath)
      const writeStream = sftp.createWriteStream(remotePath)

      let transferred = 0
      let total = 0

      // 获取文件大小
      readStream.on('open', () => {
        const stats = require('fs').statSync(localPath)
        total = stats.size
      })

      readStream.on('data', (chunk: string | Buffer) => {
        const chunkLength = typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length
        transferred += chunkLength
        if (onProgress && total > 0) {
          onProgress(transferred, total)
        }
      })

      writeStream.on('close', () => {
        resolve()
      })

      writeStream.on('error', (err: Error) => {
        reject(err)
      })

      readStream.on('error', (err: Error) => {
        reject(err)
      })

      readStream.pipe(writeStream)
    })
  }

  /**
   * 从远程服务器下载文件
   */
  async downloadFile(
    sessionId: string,
    remotePath: string,
    localPath: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    // 获取远程文件大小
    const stats = await new Promise<{ size: number }>((resolve, reject) => {
      sftp.stat(remotePath, (err, stats) => {
        if (err) reject(err)
        else resolve(stats)
      })
    })

    const total = stats.size
    let transferred = 0

    const readStream = sftp.createReadStream(remotePath)
    const writeStream = createWriteStream(localPath)

    readStream.on('data', (chunk: Buffer) => {
      transferred += chunk.length
      if (onProgress && total > 0) {
        onProgress(transferred, total)
      }
    })

    await pipeline(readStream, writeStream)
  }

  /**
   * 从 Buffer 上传文件
   */
  async uploadBuffer(
    sessionId: string,
    buffer: Buffer,
    remotePath: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      const writeStream = sftp.createWriteStream(remotePath)
      const total = buffer.length
      let transferred = 0

      writeStream.on('close', () => {
        resolve()
      })

      writeStream.on('error', (err: Error) => {
        reject(err)
      })

      // 分块写入以支持进度回调
      const chunkSize = 64 * 1024 // 64KB
      let offset = 0

      const writeChunk = () => {
        while (offset < total) {
          const end = Math.min(offset + chunkSize, total)
          const chunk = buffer.slice(offset, end)
          const canContinue = writeStream.write(chunk)
          
          transferred = end
          if (onProgress) {
            onProgress(transferred, total)
          }
          
          offset = end
          
          if (!canContinue) {
            writeStream.once('drain', writeChunk)
            return
          }
        }
        writeStream.end()
      }

      writeChunk()
    })
  }

  /**
   * 下载文件到 Buffer
   */
  async downloadBuffer(
    sessionId: string,
    remotePath: string,
    onProgress?: ProgressCallback
  ): Promise<Buffer> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    // 获取远程文件大小
    const stats = await new Promise<{ size: number }>((resolve, reject) => {
      sftp.stat(remotePath, (err, stats) => {
        if (err) reject(err)
        else resolve(stats)
      })
    })

    const total = stats.size
    let transferred = 0

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const readStream = sftp.createReadStream(remotePath)

      readStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        transferred += chunk.length
        if (onProgress && total > 0) {
          onProgress(transferred, total)
        }
      })

      readStream.on('end', () => {
        resolve(Buffer.concat(chunks))
      })

      readStream.on('error', (err: Error) => {
        reject(err)
      })
    })
  }
}

// 单例实例
export const fileTransferManager = new FileTransferManager()
