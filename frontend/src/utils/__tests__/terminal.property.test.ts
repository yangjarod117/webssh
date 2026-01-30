import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateTerminalSize, isValidTerminalSize } from '../terminal'

/**
 * **Feature: web-ssh-terminal, Property 2: 终端尺寸计算正确性**
 * **Validates: Requirements 2.4**
 * 
 * *For any* 有效的容器尺寸（宽度 > 0，高度 > 0），终端尺寸计算函数应该返回正整数的行数和列数，
 * 且行数和列数都大于 0。
 */
describe('Property 2: 终端尺寸计算正确性', () => {
  it('should return positive integer cols and rows for valid container size', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 5000, noNaN: true }),
        fc.double({ min: 1, max: 5000, noNaN: true }),
        (containerWidth: number, containerHeight: number) => {
          const { cols, rows } = calculateTerminalSize(containerWidth, containerHeight)
          
          // 列数和行数都应该是正整数
          expect(cols).toBeGreaterThan(0)
          expect(rows).toBeGreaterThan(0)
          expect(Number.isInteger(cols)).toBe(true)
          expect(Number.isInteger(rows)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return default size for invalid container dimensions', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 0, noNaN: true }),
        fc.double({ min: -1000, max: 0, noNaN: true }),
        (invalidWidth: number, invalidHeight: number) => {
          const { cols, rows } = calculateTerminalSize(invalidWidth, invalidHeight)
          
          // 应该返回默认尺寸
          expect(cols).toBe(80)
          expect(rows).toBe(24)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should scale proportionally with container size', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 2000, noNaN: true }),
        fc.double({ min: 100, max: 2000, noNaN: true }),
        fc.double({ min: 1.1, max: 3, noNaN: true }),
        (width: number, height: number, scale: number) => {
          const size1 = calculateTerminalSize(width, height)
          const size2 = calculateTerminalSize(width * scale, height * scale)
          
          // 放大后的尺寸应该更大或相等
          expect(size2.cols).toBeGreaterThanOrEqual(size1.cols)
          expect(size2.rows).toBeGreaterThanOrEqual(size1.rows)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should validate terminal size correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 200 }),
        (cols: number, rows: number) => {
          expect(isValidTerminalSize(cols, rows)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject invalid terminal sizes', () => {
    expect(isValidTerminalSize(0, 24)).toBe(false)
    expect(isValidTerminalSize(80, 0)).toBe(false)
    expect(isValidTerminalSize(-1, 24)).toBe(false)
    expect(isValidTerminalSize(80, -1)).toBe(false)
    expect(isValidTerminalSize(80.5, 24)).toBe(false)
    expect(isValidTerminalSize(80, 24.5)).toBe(false)
  })
})
