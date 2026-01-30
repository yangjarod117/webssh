import type { FileEntry, Stats } from 'ssh2'
import type { FileStats } from '../types'
import { sshManager } from './ssh-manager'

/**
 * SFTP 文件操作管理器
 */
export class SFTPManager {
  /**
   * 列出目录内容
   */
  async listDirectory(sessionId: string, path: string): Promise<FileStats[]> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      sftp.readdir(path, (err, list) => {
        if (err) {
          reject(err)
          return
        }

        const files: FileStats[] = list.map((item: FileEntry) => ({
          name: item.filename,
          path: `${path}/${item.filename}`.replace(/\/+/g, '/'),
          type: this.getFileType(item.attrs),
          size: item.attrs.size,
          mode: item.attrs.mode,
          uid: item.attrs.uid,
          gid: item.attrs.gid,
          atime: new Date(item.attrs.atime * 1000),
          mtime: new Date(item.attrs.mtime * 1000),
        }))

        resolve(files)
      })
    })
  }

  /**
   * 读取文件内容
   */
  async readFile(sessionId: string, path: string): Promise<string> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      const stream = sftp.createReadStream(path)

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'))
      })

      stream.on('error', (err: Error) => {
        reject(err)
      })
    })
  }

  /**
   * 写入文件内容
   */
  async writeFile(sessionId: string, path: string, content: string): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      const stream = sftp.createWriteStream(path)

      stream.on('close', () => {
        resolve()
      })

      stream.on('error', (err: Error) => {
        reject(err)
      })

      stream.end(content, 'utf-8')
    })
  }

  /**
   * 创建目录
   */
  async createDirectory(sessionId: string, path: string): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      sftp.mkdir(path, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  /**
   * 创建文件
   */
  async createFile(sessionId: string, path: string): Promise<void> {
    return this.writeFile(sessionId, path, '')
  }

  /**
   * 删除文件
   */
  async deleteFile(sessionId: string, path: string): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      sftp.unlink(path, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  /**
   * 删除目录
   */
  async deleteDirectory(sessionId: string, path: string): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    // 递归删除目录内容
    const files = await this.listDirectory(sessionId, path)
    for (const file of files) {
      if (file.type === 'directory') {
        await this.deleteDirectory(sessionId, file.path)
      } else {
        await this.deleteFile(sessionId, file.path)
      }
    }

    return new Promise((resolve, reject) => {
      sftp.rmdir(path, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  /**
   * 重命名文件或目录
   */
  async rename(sessionId: string, oldPath: string, newPath: string): Promise<void> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      sftp.rename(oldPath, newPath, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  /**
   * 获取文件信息
   */
  async stat(sessionId: string, path: string): Promise<FileStats> {
    const session = sshManager.getSession(sessionId)
    if (!session) throw new Error('Session not found')

    await sshManager.getSFTP(sessionId)
    const sftp = session.sftp
    if (!sftp) throw new Error('SFTP not initialized')

    return new Promise((resolve, reject) => {
      sftp.stat(path, (err, stats) => {
        if (err) {
          reject(err)
          return
        }

        const name = path.split('/').pop() || ''
        resolve({
          name,
          path,
          type: this.getFileTypeFromStats(stats),
          size: stats.size,
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid,
          atime: new Date(stats.atime * 1000),
          mtime: new Date(stats.mtime * 1000),
        })
      })
    })
  }

  /**
   * 检查文件是否存在
   */
  async exists(sessionId: string, path: string): Promise<boolean> {
    try {
      await this.stat(sessionId, path)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取文件类型
   */
  private getFileType(attrs: { mode: number }): FileStats['type'] {
    const mode = attrs.mode
    if ((mode & 0o170000) === 0o040000) return 'directory'
    if ((mode & 0o170000) === 0o120000) return 'symlink'
    return 'file'
  }

  /**
   * 从 Stats 获取文件类型
   */
  private getFileTypeFromStats(stats: Stats): FileStats['type'] {
    if (stats.isDirectory()) return 'directory'
    if (stats.isSymbolicLink()) return 'symlink'
    return 'file'
  }
}

// 单例实例
export const sftpManager = new SFTPManager()
