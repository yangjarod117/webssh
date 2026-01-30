import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateTabOverflow } from '../TabBar'

/**
 * **Feature: web-ssh-terminal, Property 15: 标签页溢出检测正确性**
 * **Validates: Requirements 10.7**
 * 
 * *For any* 标签页数量和可见区域宽度，溢出检测函数应该正确判断是否需要显示滚动控件。
 */
describe('Property 15: 标签页溢出检测正确性', () => {
  // 正整数生成器
  const positiveIntArb = fc.integer({ min: 1, max: 100 })
  const positiveWidthArb = fc.integer({ min: 50, max: 2000 })
  const tabWidthArb = fc.integer({ min: 80, max: 200 })
  const buttonWidthArb = fc.integer({ min: 20, max: 100 })

  it('should return true when total tabs width exceeds available container width', () => {
    fc.assert(
      fc.property(
        positiveIntArb,
        tabWidthArb,
        positiveWidthArb,
        buttonWidthArb,
        (tabCount: number, tabWidth: number, containerWidth: number, buttonWidth: number) => {
          const totalTabsWidth = tabCount * tabWidth
          const availableWidth = containerWidth - buttonWidth
          
          const result = calculateTabOverflow(tabCount, tabWidth, containerWidth, buttonWidth)
          
          // 当总标签宽度超过可用宽度时，应该返回 true
          if (totalTabsWidth > availableWidth) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when container width is zero or negative', () => {
    fc.assert(
      fc.property(
        positiveIntArb,
        tabWidthArb,
        fc.integer({ min: -100, max: 0 }),
        (tabCount: number, tabWidth: number, containerWidth: number) => {
          const result = calculateTabOverflow(tabCount, tabWidth, containerWidth)
          
          // 容器宽度为 0 或负数时，应该返回 false
          expect(result).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when tab count is zero or negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 0 }),
        tabWidthArb,
        positiveWidthArb,
        (tabCount: number, tabWidth: number, containerWidth: number) => {
          const result = calculateTabOverflow(tabCount, tabWidth, containerWidth)
          
          // 标签数量为 0 或负数时，应该返回 false
          expect(result).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should correctly detect overflow boundary conditions', () => {
    fc.assert(
      fc.property(
        positiveIntArb,
        tabWidthArb,
        buttonWidthArb,
        (tabCount: number, tabWidth: number, buttonWidth: number) => {
          // 设置容器宽度刚好等于总标签宽度 + 按钮宽度
          const exactFitWidth = tabCount * tabWidth + buttonWidth
          
          // 刚好不溢出
          const resultExact = calculateTabOverflow(tabCount, tabWidth, exactFitWidth, buttonWidth)
          expect(resultExact).toBe(false)
          
          // 少 1 像素就溢出
          const resultOverflow = calculateTabOverflow(tabCount, tabWidth, exactFitWidth - 1, buttonWidth)
          expect(resultOverflow).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should use default button width when not provided', () => {
    fc.assert(
      fc.property(
        positiveIntArb,
        tabWidthArb,
        positiveWidthArb,
        (tabCount: number, tabWidth: number, containerWidth: number) => {
          const defaultButtonWidth = 40
          const totalTabsWidth = tabCount * tabWidth
          const availableWidth = containerWidth - defaultButtonWidth
          
          const result = calculateTabOverflow(tabCount, tabWidth, containerWidth)
          
          if (totalTabsWidth > availableWidth) {
            expect(result).toBe(true)
          } else {
            expect(result).toBe(false)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
