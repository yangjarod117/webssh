import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { ErrorType, errorMessages, getErrorMessage } from '../errors'

/**
 * **Feature: web-ssh-terminal, Property 1: 错误类型映射一致性**
 * **Validates: Requirements 1.4**
 * 
 * *For any* SSH 连接错误类型（认证失败、连接超时、主机不可达等），
 * 错误处理函数应该返回对应的用户友好错误消息，且消息不为空。
 */
describe('Property 1: 错误类型映射一致性', () => {
  // 所有错误类型的数组
  const allErrorTypes = Object.values(ErrorType)

  it('should return non-empty message for all error types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allErrorTypes),
        (errorType: ErrorType) => {
          const message = getErrorMessage(errorType)
          
          // 消息不为空
          expect(message).toBeTruthy()
          expect(message.length).toBeGreaterThan(0)
          
          // 消息是字符串
          expect(typeof message).toBe('string')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have consistent mapping between ErrorType and errorMessages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allErrorTypes),
        (errorType: ErrorType) => {
          // 每个错误类型都应该在 errorMessages 中有对应的消息
          expect(errorMessages[errorType]).toBeDefined()
          expect(errorMessages[errorType]).toBe(getErrorMessage(errorType))
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return UNKNOWN message for invalid error types', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s: string) => !allErrorTypes.includes(s as ErrorType)),
        (invalidType: string) => {
          // 对于无效的错误类型，应该返回 UNKNOWN 的消息
          const message = getErrorMessage(invalidType as ErrorType)
          expect(message).toBe(errorMessages[ErrorType.UNKNOWN])
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
