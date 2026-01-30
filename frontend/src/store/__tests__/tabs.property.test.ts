import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { Tab } from '../../types'
import {
  addTabToList,
  removeTabFromList,
  switchActiveTab,
  reorderTabList,
  tabExists,
} from '../tabs'

// 标签页生成器
const tabArb: fc.Arbitrary<Tab> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  sessionId: fc.uuid(),
  isConnected: fc.boolean(),
})

// 标签页列表生成器
const tabListArb: fc.Arbitrary<Tab[]> = fc.array(tabArb, { minLength: 0, maxLength: 20 })

/**
 * **Feature: web-ssh-terminal, Property 12: 标签页增删数量一致性**
 * **Validates: Requirements 10.1, 10.3**
 * 
 * *For any* 标签页列表，添加一个标签页后数量增加 1；
 * 删除一个标签页后数量减少 1，且被删除的标签页不再存在于列表中。
 */
describe('Property 12: 标签页增删数量一致性', () => {
  it('should increase count by 1 when adding a tab', () => {
    fc.assert(
      fc.property(tabListArb, tabArb, (tabs: Tab[], newTab: Tab) => {
        const originalLength = tabs.length
        const result = addTabToList(tabs, newTab)
        
        // 数量应该增加 1
        expect(result.length).toBe(originalLength + 1)
        
        // 新标签页应该存在于列表中
        expect(tabExists(result, newTab.id)).toBe(true)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should decrease count by 1 when removing a tab', () => {
    fc.assert(
      fc.property(
        tabListArb.filter((list) => list.length > 0),
        (tabs: Tab[]) => {
          const indexToRemove = Math.floor(Math.random() * tabs.length)
          const idToRemove = tabs[indexToRemove].id
          const originalLength = tabs.length
          
          const result = removeTabFromList(tabs, idToRemove)
          
          // 数量应该减少 1
          expect(result.length).toBe(originalLength - 1)
          
          // 被删除的标签页不应存在于列表中
          expect(tabExists(result, idToRemove)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 13: 标签页切换正确性**
 * **Validates: Requirements 10.2**
 * 
 * *For any* 标签页列表和目标标签页 ID，切换操作后 activeTabId 应该等于目标 ID。
 */
describe('Property 13: 标签页切换正确性', () => {
  it('should set activeTabId to target ID when tab exists', () => {
    fc.assert(
      fc.property(
        tabListArb.filter((list) => list.length > 0),
        (tabs: Tab[]) => {
          const targetIndex = Math.floor(Math.random() * tabs.length)
          const targetId = tabs[targetIndex].id
          
          const result = switchActiveTab(tabs, targetId)
          
          // activeTabId 应该等于目标 ID
          expect(result).toBe(targetId)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null when tab does not exist', () => {
    fc.assert(
      fc.property(tabListArb, fc.uuid(), (tabs: Tab[], nonExistentId: string) => {
        // 确保 ID 不存在于列表中
        const filteredTabs = tabs.filter((t) => t.id !== nonExistentId)
        
        const result = switchActiveTab(filteredTabs, nonExistentId)
        
        // 应该返回 null
        expect(result).toBeNull()
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 14: 标签页重排数量不变性**
 * **Validates: Requirements 10.6**
 * 
 * *For any* 标签页列表和重排操作（fromIndex, toIndex），
 * 重排后标签页数量不变，且所有原有标签页仍然存在。
 */
describe('Property 14: 标签页重排数量不变性', () => {
  it('should preserve tab count after reordering', () => {
    fc.assert(
      fc.property(
        tabListArb.filter((list) => list.length >= 2),
        fc.nat(),
        fc.nat(),
        (tabs: Tab[], fromIndex: number, toIndex: number) => {
          // 确保索引在有效范围内
          const validFromIndex = fromIndex % tabs.length
          const validToIndex = toIndex % tabs.length
          const originalLength = tabs.length
          
          const result = reorderTabList(tabs, validFromIndex, validToIndex)
          
          // 数量不应改变
          expect(result.length).toBe(originalLength)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should preserve all tabs after reordering', () => {
    fc.assert(
      fc.property(
        tabListArb.filter((list) => list.length >= 2),
        fc.nat(),
        fc.nat(),
        (tabs: Tab[], fromIndex: number, toIndex: number) => {
          const validFromIndex = fromIndex % tabs.length
          const validToIndex = toIndex % tabs.length
          const originalIds = tabs.map((t) => t.id)
          
          const result = reorderTabList(tabs, validFromIndex, validToIndex)
          
          // 所有原有标签页都应该存在
          originalIds.forEach((id) => {
            expect(tabExists(result, id)).toBe(true)
          })
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not change list for invalid indices', () => {
    fc.assert(
      fc.property(tabListArb, (tabs: Tab[]) => {
        const invalidFromIndex = tabs.length + 10
        const invalidToIndex = tabs.length + 20
        
        const result = reorderTabList(tabs, invalidFromIndex, invalidToIndex)
        
        // 列表应该保持不变
        expect(result.length).toBe(tabs.length)
        
        return true
      }),
      { numRuns: 100 }
    )
  })
})
