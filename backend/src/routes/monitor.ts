import { Router, Request, Response, NextFunction } from 'express'
import { sshManager } from '../services/ssh-manager.js'
import type { ApiError } from '../types/index.js'

const router = Router()

/**
 * 获取系统监控数据
 * GET /api/sessions/:id/monitor
 */
router.get('/:id/monitor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const session = sshManager.getSession(id)

    if (!session || !session.connection) {
      const error: ApiError = {
        code: 'SESSION_NOT_FOUND',
        message: '会话不存在',
      }
      return res.status(404).json(error)
    }

    // 执行监控命令
    const monitorData = await executeMonitorCommands(session.connection)
    res.json(monitorData)
  } catch (err) {
    next(err)
  }
})

/**
 * 获取登录历史
 * GET /api/sessions/:id/login-history
 */
router.get('/:id/login-history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const session = sshManager.getSession(id)

    if (!session || !session.connection) {
      const error: ApiError = {
        code: 'SESSION_NOT_FOUND',
        message: '会话不存在',
      }
      return res.status(404).json(error)
    }

    const loginHistory = await getLoginHistory(session.connection)
    res.json({ history: loginHistory })
  } catch (err) {
    next(err)
  }
})

/**
 * 获取内存占用前10进程
 * GET /api/sessions/:id/top-processes
 */
router.get('/:id/top-processes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const session = sshManager.getSession(id)

    if (!session || !session.connection) {
      const error: ApiError = {
        code: 'SESSION_NOT_FOUND',
        message: '会话不存在',
      }
      return res.status(404).json(error)
    }

    const processes = await getTopProcesses(session.connection)
    res.json({ processes })
  } catch (err) {
    next(err)
  }
})

/**
 * 获取内存占用前10进程
 */
async function getTopProcesses(client: any): Promise<Array<{
  user: string
  name: string
  memoryMB: number
  memoryPercent: number
}>> {
  const execCommand = (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      client.exec(cmd, (err: Error, stream: any) => {
        if (err) {
          reject(err)
          return
        }
        let output = ''
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.on('close', () => {
          resolve(output.trim())
        })
        stream.stderr.on('data', () => {})
      })
    })
  }

  try {
    // 获取内存占用前10的进程
    const output = await execCommand(
      "ps aux --sort=-%mem | head -11 | tail -10 | awk '{print $1,$11,$6,$4}'"
    )
    
    const processes: Array<{
      user: string
      name: string
      memoryMB: number
      memoryPercent: number
    }> = []

    const lines = output.split('\n').filter(line => line.trim())
    for (const line of lines) {
      const parts = line.split(/\s+/)
      if (parts.length >= 4) {
        const user = parts[0]
        const name = parts[1].split('/').pop() || parts[1] // 取程序名
        const memoryKB = parseInt(parts[2]) || 0
        const memoryPercent = parseFloat(parts[3]) || 0
        
        processes.push({
          user,
          name: name.substring(0, 20), // 限制长度
          memoryMB: memoryKB / 1024,
          memoryPercent
        })
      }
    }

    return processes
  } catch (error) {
    console.error('Top processes error:', error)
    return []
  }
}

/**
 * 执行监控命令获取系统信息
 */
async function executeMonitorCommands(client: any): Promise<any> {
  const execCommand = (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      client.exec(cmd, (err: Error, stream: any) => {
        if (err) {
          reject(err)
          return
        }
        let output = ''
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.on('close', () => {
          resolve(output.trim())
        })
        stream.stderr.on('data', () => {
          // 忽略 stderr
        })
      })
    })
  }

  try {
    // 并行执行所有命令
    const [cpuInfo, memInfo, diskInfo, netInfo, uptimeInfo, loadInfo] = await Promise.all([
      // CPU 使用率
      execCommand("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1").catch(() => '0'),
      // 内存信息
      execCommand("free -b | grep Mem | awk '{print $2,$3,$4,$7}'").catch(() => '0 0 0 0'),
      // 磁盘信息
      execCommand("df -B1 / | tail -1 | awk '{print $2,$3,$4,$5}'").catch(() => '0 0 0 0%'),
      // 网络流量 (获取主网卡)
      execCommand("cat /proc/net/dev | grep -E 'eth0|ens|enp' | head -1 | awk '{print $2,$10}'").catch(() => '0 0'),
      // 系统运行时间
      execCommand("uptime -p 2>/dev/null || uptime | sed 's/.*up //' | cut -d',' -f1-2").catch(() => 'unknown'),
      // 系统负载
      execCommand("cat /proc/loadavg | awk '{print $1,$2,$3}'").catch(() => '0 0 0'),
    ])

    // 解析内存信息
    const memParts = memInfo.split(' ')
    const memTotal = parseInt(memParts[0]) || 0
    const memUsed = parseInt(memParts[1]) || 0
    const memFree = parseInt(memParts[2]) || 0
    const memAvailable = parseInt(memParts[3]) || memFree

    // 解析磁盘信息
    const diskParts = diskInfo.split(' ')
    const diskTotal = parseInt(diskParts[0]) || 0
    const diskUsed = parseInt(diskParts[1]) || 0
    const diskFree = parseInt(diskParts[2]) || 0
    const diskPercent = diskParts[3] || '0%'

    // 解析网络流量
    const netParts = netInfo.split(' ')
    const netRx = parseInt(netParts[0]) || 0
    const netTx = parseInt(netParts[1]) || 0

    // 解析负载
    const loadParts = loadInfo.split(' ')

    return {
      cpu: {
        usage: parseFloat(cpuInfo) || 0,
      },
      memory: {
        total: memTotal,
        used: memUsed,
        free: memFree,
        available: memAvailable,
        usagePercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        free: diskFree,
        usagePercent: parseInt(diskPercent) || 0,
      },
      network: {
        rxBytes: netRx,
        txBytes: netTx,
      },
      system: {
        uptime: uptimeInfo,
        load: {
          load1: parseFloat(loadParts[0]) || 0,
          load5: parseFloat(loadParts[1]) || 0,
          load15: parseFloat(loadParts[2]) || 0,
        },
      },
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('Monitor command error:', error)
    return {
      cpu: { usage: 0 },
      memory: { total: 0, used: 0, free: 0, available: 0, usagePercent: 0 },
      disk: { total: 0, used: 0, free: 0, usagePercent: 0 },
      network: { rxBytes: 0, txBytes: 0 },
      system: { uptime: 'unknown', load: { load1: 0, load5: 0, load15: 0 } },
      timestamp: Date.now(),
    }
  }
}

/**
 * 获取登录历史
 */
async function getLoginHistory(client: any): Promise<Array<{
  user: string
  ip: string
  time: string
  duration: string
  status: 'success' | 'failed' | 'current'
}>> {
  const execCommand = (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      client.exec(cmd, (err: Error, stream: any) => {
        if (err) {
          reject(err)
          return
        }
        let output = ''
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.on('close', () => {
          resolve(output.trim())
        })
        stream.stderr.on('data', () => {
          // 忽略 stderr
        })
      })
    })
  }

  try {
    // 获取成功登录历史 (last 命令，最近 20 条)
    const lastOutput = await execCommand('last -20 -i 2>/dev/null || last -20')
    
    // 获取失败登录尝试 (lastb 命令，需要 root 权限)
    const lastbOutput = await execCommand('lastb -10 -i 2>/dev/null || echo ""').catch(() => '')

    const history: Array<{
      user: string
      ip: string
      time: string
      duration: string
      status: 'success' | 'failed' | 'current'
    }> = []

    // 解析成功登录
    const lastLines = lastOutput.split('\n').filter(line => 
      line.trim() && 
      !line.includes('wtmp begins') && 
      !line.includes('reboot') &&
      !line.startsWith('wtmp')
    )

    for (const line of lastLines.slice(0, 15)) {
      const parts = line.split(/\s+/)
      if (parts.length >= 3) {
        const user = parts[0]
        // 跳过系统用户
        if (user === 'reboot' || user === 'shutdown') continue
        
        // 解析 IP (可能在不同位置)
        let ip = '-'
        let timeStart = 2
        
        // 查找 IP 地址
        for (let i = 1; i < parts.length; i++) {
          if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parts[i]) || parts[i].includes(':')) {
            ip = parts[i]
            timeStart = i + 1
            break
          }
          if (parts[i] === 'pts/0' || parts[i] === 'pts/1' || parts[i].startsWith('pts/') || parts[i].startsWith('tty')) {
            timeStart = i + 1
          }
        }

        // 解析时间
        const timeParts = parts.slice(timeStart, timeStart + 4)
        const time = timeParts.join(' ')

        // 解析持续时间或状态
        let duration = '-'
        let status: 'success' | 'current' = 'success'
        
        const remaining = parts.slice(timeStart + 4).join(' ')
        if (remaining.includes('still logged in') || remaining.includes('still running')) {
          duration = '在线中'
          status = 'current'
        } else if (remaining.includes('(')) {
          const match = remaining.match(/\(([^)]+)\)/)
          if (match) {
            duration = match[1]
          }
        }

        history.push({ user, ip, time, duration, status })
      }
    }

    // 解析失败登录
    if (lastbOutput) {
      const lastbLines = lastbOutput.split('\n').filter(line => 
        line.trim() && !line.includes('btmp begins')
      )

      for (const line of lastbLines.slice(0, 5)) {
        const parts = line.split(/\s+/)
        if (parts.length >= 3) {
          const user = parts[0]
          let ip = '-'
          
          for (let i = 1; i < parts.length; i++) {
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parts[i])) {
              ip = parts[i]
              break
            }
          }

          // 简化时间显示
          const timeMatch = line.match(/\w{3}\s+\w{3}\s+\d+\s+\d+:\d+/)
          const time = timeMatch ? timeMatch[0] : '-'

          history.push({
            user,
            ip,
            time,
            duration: '-',
            status: 'failed'
          })
        }
      }
    }

    return history
  } catch (error) {
    console.error('Login history error:', error)
    return []
  }
}

export default router
