import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { EditorFile } from '../../types'
import { checkIsDirty, createEditorFile, updateContent } from '../editor'

/**
 * **Feature: web-ssh-terminal, Property 5: 编辑器脏状态检测正确性**
 * **Validates: Requirements 4.4, 4.5**
 * 
 * *For any* 编辑器状态，当当前内容与原始内容不同时，isDirty 应该为 true；
 * 当内容相同时，isDirty 应该为 false。
 */
describe('Property 5: 编辑器脏状态检测正确性', () => {
  it('should return true when content differs from original', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (content: string, originalContent: string) => {
          // 只测试内容不同的情况
          fc.pre(content !== originalContent)
          
          const isDirty = checkIsDirty(content, originalContent)
          
          expect(isDirty).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when content equals original', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (content: string) => {
        const isDirty = checkIsDirty(content, content)
        
        expect(isDirty).toBe(false)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should correctly set isDirty when creating EditorFile', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (id: string, path: string, content: string, originalContent: string) => {
          const file = createEditorFile(id, path, content, originalContent)
          
          // isDirty 应该正确反映内容是否改变
          expect(file.isDirty).toBe(content !== originalContent)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should update isDirty when content changes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (id: string, path: string, originalContent: string, newContent: string) => {
          // 创建初始文件（未修改状态）
          const file: EditorFile = {
            id,
            path,
            content: originalContent,
            originalContent,
            isDirty: false,
          }
          
          // 更新内容
          const updatedFile = updateContent(file, newContent)
          
          // isDirty 应该正确反映新内容是否与原始内容不同
          expect(updatedFile.isDirty).toBe(newContent !== originalContent)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should become clean when content reverts to original', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (id: string, path: string, originalContent: string, tempContent: string) => {
          // 确保临时内容与原始内容不同
          fc.pre(tempContent !== originalContent)
          
          // 创建初始文件
          const file: EditorFile = {
            id,
            path,
            content: originalContent,
            originalContent,
            isDirty: false,
          }
          
          // 修改内容
          const modifiedFile = updateContent(file, tempContent)
          expect(modifiedFile.isDirty).toBe(true)
          
          // 恢复原始内容
          const revertedFile = updateContent(modifiedFile, originalContent)
          expect(revertedFile.isDirty).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
