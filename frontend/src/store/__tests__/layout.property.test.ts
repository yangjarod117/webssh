import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { SplitLayoutState } from '../../types'
import {
  clampRatio,
  isValidRatio,
  calculateRatioFromPosition,
  collapseLayout,
  expandLayout,
  collapseAndExpand,
  serializeLayout,
  deserializeLayout,
  MIN_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
} from '../layout'

// 有效比例生成器
const validRatioArb = fc.double({ min: MIN_SPLIT_RATIO, max: MAX_SPLIT_RATIO, noNaN: true })

// 任意比例生成器（包括无效值）
const anyRatioArb = fc.double({ min: -1, max: 2, noNaN: true })

// 分栏状态生成器（未折叠）
const expandedLayoutArb: fc.Arbitrary<SplitLayoutState> = fc.record({
  ratio: validRatioArb,
  isCollapsed: fc.constant(false),
  collapsedRatio: validRatioArb,
})

// 分栏状态生成器（任意状态）
const layoutStateArb: fc.Arbitrary<SplitLayoutState> = fc.record({
  ratio: fc.double({ min: 0, max: MAX_SPLIT_RATIO, noNaN: true }),
  isCollapsed: fc.boolean(),
  collapsedRatio: validRatioArb,
})

/**
 * **Feature: web-ssh-terminal, Property 16: 分栏比例有效性**
 * **Validates: Requirements 11.2**
 * 
 * *For any* 拖动位置和容器宽度，分栏比例计算函数应该返回在有效范围内（如 0.1-0.9）的比例值。
 */
describe('Property 16: 分栏比例有效性', () => {
  it('should clamp ratio to valid range', () => {
    fc.assert(
      fc.property(anyRatioArb, (ratio: number) => {
        const clamped = clampRatio(ratio)
        
        // 结果应该在有效范围内
        expect(clamped).toBeGreaterThanOrEqual(MIN_SPLIT_RATIO)
        expect(clamped).toBeLessThanOrEqual(MAX_SPLIT_RATIO)
        expect(isValidRatio(clamped)).toBe(true)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should calculate valid ratio from position', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2000, noNaN: true }),
        fc.double({ min: 1, max: 2000, noNaN: true }),
        (position: number, containerWidth: number) => {
          const ratio = calculateRatioFromPosition(position, containerWidth)
          
          // 结果应该在有效范围内
          expect(ratio).toBeGreaterThanOrEqual(MIN_SPLIT_RATIO)
          expect(ratio).toBeLessThanOrEqual(MAX_SPLIT_RATIO)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return default ratio for invalid container width', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: -1000, max: 0, noNaN: true }),
        (position: number, invalidWidth: number) => {
          const ratio = calculateRatioFromPosition(position, invalidWidth)
          
          // 应该返回默认比例
          expect(isValidRatio(ratio)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 17: 分栏折叠展开往返一致性**
 * **Validates: Requirements 11.4, 11.5**
 * 
 * *For any* 分栏状态，折叠后再展开应该恢复到折叠前的状态（包括分栏比例）。
 */
describe('Property 17: 分栏折叠展开往返一致性', () => {
  it('should restore ratio after collapse and expand', () => {
    fc.assert(
      fc.property(expandedLayoutArb, (state: SplitLayoutState) => {
        const originalRatio = state.ratio
        
        // 折叠后再展开
        const result = collapseAndExpand(state)
        
        // 比例应该恢复
        expect(result.ratio).toBe(originalRatio)
        expect(result.isCollapsed).toBe(false)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should set ratio to 0 when collapsed', () => {
    fc.assert(
      fc.property(expandedLayoutArb, (state: SplitLayoutState) => {
        const collapsed = collapseLayout(state)
        
        // 折叠后比例应该为 0
        expect(collapsed.ratio).toBe(0)
        expect(collapsed.isCollapsed).toBe(true)
        // 应该保存折叠前的比例
        expect(collapsed.collapsedRatio).toBe(state.ratio)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should not change already collapsed state', () => {
    fc.assert(
      fc.property(validRatioArb, (collapsedRatio: number) => {
        const collapsedState: SplitLayoutState = {
          ratio: 0,
          isCollapsed: true,
          collapsedRatio,
        }
        
        const result = collapseLayout(collapsedState)
        
        // 已折叠的状态不应改变
        expect(result).toEqual(collapsedState)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should not change already expanded state', () => {
    fc.assert(
      fc.property(expandedLayoutArb, (state: SplitLayoutState) => {
        const result = expandLayout(state)
        
        // 已展开的状态不应改变
        expect(result).toEqual(state)
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 18: 分栏比例持久化往返一致性**
 * **Validates: Requirements 11.6**
 * 
 * *For any* 有效的分栏比例，保存到本地存储后再加载，应该得到相同的比例值。
 */
describe('Property 18: 分栏比例持久化往返一致性', () => {
  it('should round-trip layout state through serialization', () => {
    fc.assert(
      fc.property(layoutStateArb, (state: SplitLayoutState) => {
        // 序列化
        const serialized = serializeLayout(state)
        
        // 反序列化
        const deserialized = deserializeLayout(serialized)
        
        // 应该得到相同的状态
        expect(deserialized).not.toBeNull()
        expect(deserialized!.ratio).toBe(state.ratio)
        expect(deserialized!.isCollapsed).toBe(state.isCollapsed)
        expect(deserialized!.collapsedRatio).toBe(state.collapsedRatio)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return null for invalid JSON', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => {
          try {
            JSON.parse(s)
            return false
          } catch {
            return true
          }
        }),
        (invalidJson: string) => {
          const result = deserializeLayout(invalidJson)
          expect(result).toBeNull()
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null for JSON missing required fields', () => {
    const result1 = deserializeLayout(JSON.stringify({ ratio: 0.5 }))
    expect(result1).toBeNull()
    
    const result2 = deserializeLayout(JSON.stringify({ isCollapsed: false }))
    expect(result2).toBeNull()
    
    const result3 = deserializeLayout(JSON.stringify({ collapsedRatio: 0.3 }))
    expect(result3).toBeNull()
  })
})
