import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { ConnectionConfig, SavedConnection } from '../../types'
import {
  serializeConnection,
  connectionContainsPassword,
  removeConnection,
  connectionExists,
} from '../connections'

// 连接配置生成器
const connectionConfigArb: fc.Arbitrary<ConnectionConfig> = fc.record({
  host: fc.string({ minLength: 1, maxLength: 100 }),
  port: fc.integer({ min: 1, max: 65535 }),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  authType: fc.constantFrom<'password' | 'key'>('password', 'key'),
  password: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  privateKey: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
})

// 已保存连接生成器
const savedConnectionArb: fc.Arbitrary<SavedConnection> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  host: fc.string({ minLength: 1, maxLength: 100 }),
  port: fc.integer({ min: 1, max: 65535 }),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  authType: fc.constantFrom<'password' | 'key'>('password', 'key'),
  createdAt: fc.date(),
  lastUsedAt: fc.date(),
})

// 已保存连接列表生成器
const savedConnectionListArb: fc.Arbitrary<SavedConnection[]> = fc.array(savedConnectionArb, {
  minLength: 0,
  maxLength: 20,
})

/**
 * **Feature: web-ssh-terminal, Property 7: 连接配置持久化安全性**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * *For any* 连接配置（包含密码），序列化后的数据不应包含密码字段；
 * 反序列化后应该恢复除密码外的所有字段。
 */
describe('Property 7: 连接配置持久化安全性', () => {
  it('should not contain password in serialized connection', () => {
    fc.assert(
      fc.property(
        connectionConfigArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.uuid(),
        (config: ConnectionConfig, name: string, id: string) => {
          const serialized = serializeConnection(config, name, id)
          
          // 序列化后不应包含密码
          expect(connectionContainsPassword(serialized)).toBe(false)
          
          // 验证 JSON 字符串中不包含敏感字段（作为键）
          // 注意：authType 可以是 "password"，所以我们检查 "password": 而不是 "password"
          const json = JSON.stringify(serialized)
          expect(json).not.toContain('"password":')
          expect(json).not.toContain('"privateKey":')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve non-sensitive fields after serialization', () => {
    fc.assert(
      fc.property(
        connectionConfigArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.uuid(),
        (config: ConnectionConfig, name: string, id: string) => {
          const serialized = serializeConnection(config, name, id)
          
          // 非敏感字段应该被保留
          expect(serialized.id).toBe(id)
          expect(serialized.name).toBe(name)
          expect(serialized.host).toBe(config.host)
          expect(serialized.port).toBe(config.port)
          expect(serialized.username).toBe(config.username)
          expect(serialized.authType).toBe(config.authType)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 8: 已保存连接删除正确性**
 * **Validates: Requirements 6.3**
 * 
 * *For any* 已保存连接列表和要删除的连接 ID，删除操作后该 ID 不应存在于列表中，
 * 且列表长度减少 1。
 */
describe('Property 8: 已保存连接删除正确性', () => {
  it('should remove connection from list', () => {
    fc.assert(
      fc.property(
        savedConnectionListArb.filter((list) => list.length > 0),
        (connections: SavedConnection[]) => {
          // 随机选择一个要删除的连接
          const indexToDelete = Math.floor(Math.random() * connections.length)
          const idToDelete = connections[indexToDelete].id
          const originalLength = connections.length
          
          const result = removeConnection(connections, idToDelete)
          
          // 删除后该 ID 不应存在
          expect(connectionExists(result, idToDelete)).toBe(false)
          
          // 列表长度应该减少 1
          expect(result.length).toBe(originalLength - 1)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not change list when deleting non-existent id', () => {
    fc.assert(
      fc.property(
        savedConnectionListArb,
        fc.uuid(),
        (connections: SavedConnection[], nonExistentId: string) => {
          // 确保 ID 不存在于列表中
          const filteredConnections = connections.filter((c) => c.id !== nonExistentId)
          const originalLength = filteredConnections.length
          
          const result = removeConnection(filteredConnections, nonExistentId)
          
          // 列表长度不应改变
          expect(result.length).toBe(originalLength)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve other connections after deletion', () => {
    fc.assert(
      fc.property(
        savedConnectionListArb.filter((list) => list.length > 1),
        (connections: SavedConnection[]) => {
          const indexToDelete = 0
          const idToDelete = connections[indexToDelete].id
          const otherIds = connections.slice(1).map((c) => c.id)
          
          const result = removeConnection(connections, idToDelete)
          
          // 其他连接应该仍然存在
          otherIds.forEach((id) => {
            expect(connectionExists(result, id)).toBe(true)
          })
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
