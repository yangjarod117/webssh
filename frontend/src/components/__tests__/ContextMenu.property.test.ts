import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'
import {
  generateContextMenuItems,
  getRequiredFileMenuItems,
  getRequiredFolderMenuItems,
  validateMenuItems,
} from '../ContextMenu'
import type { FileItem } from '../../types'

/**
 * **Feature: web-ssh-terminal, Property 3: 上下文菜单生成正确性**
 * **Validates: Requirements 3.5, 3.6**
 *
 * *For any* 文件项（文件或文件夹），上下文菜单生成函数应该返回包含所有必需菜单项的列表。
 * 文件应包含：打开、编辑、重命名、删除、复制路径、下载；
 * 文件夹应包含：打开、新建文件、新建文件夹、重命名、删除、复制路径、上传文件。
 */
describe('Property 3: 上下文菜单生成正确性', () => {
  // 文件类型生成器
  const fileTypeArb = fc.constantFrom('file', 'symlink') as fc.Arbitrary<'file' | 'symlink'>
  const directoryTypeArb = fc.constant('directory') as fc.Arbitrary<'directory'>

  // 文件名生成器
  const fileNameArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-'.split('')),
    { minLength: 1, maxLength: 50 }
  )

  // 文件路径生成器
  const filePathArb = fc.array(fileNameArb, { minLength: 1, maxLength: 5 }).map(
    (parts) => '/' + parts.join('/')
  )

  // 文件大小生成器
  const fileSizeArb = fc.integer({ min: 0, max: 1000000000 })

  // 权限字符串生成器
  const permissionsArb = fc.constantFrom('rwxr-xr-x', 'rw-r--r--', 'rwx------', 'r--r--r--')

  // 文件项生成器（文件类型）
  const fileItemArb: fc.Arbitrary<FileItem> = fc.record({
    name: fileNameArb,
    path: filePathArb,
    type: fileTypeArb,
    size: fileSizeArb,
    modifiedTime: fc.date(),
    permissions: permissionsArb,
  })

  // 文件项生成器（目录类型）
  const directoryItemArb: fc.Arbitrary<FileItem> = fc.record({
    name: fileNameArb,
    path: filePathArb,
    type: directoryTypeArb,
    size: fc.constant(0),
    modifiedTime: fc.date(),
    permissions: permissionsArb,
  })

  // 创建模拟回调函数
  const createMockCallbacks = () => ({
    onOpen: vi.fn(),
    onEdit: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onCopyPath: vi.fn(),
    onDownload: vi.fn(),
    onUpload: vi.fn(),
    onNewFile: vi.fn(),
    onNewFolder: vi.fn(),
  })

  it('should generate all required menu items for files', () => {
    fc.assert(
      fc.property(fileItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        // 验证文件菜单包含所有必需项
        const requiredIds = getRequiredFileMenuItems()
        const isValid = validateMenuItems(items, requiredIds)

        expect(isValid).toBe(true)
        expect(items.length).toBe(requiredIds.length)

        // 验证每个必需项都存在
        const itemIds = items.map((item) => item.id)
        expect(itemIds).toContain('open')
        expect(itemIds).toContain('edit')
        expect(itemIds).toContain('rename')
        expect(itemIds).toContain('delete')
        expect(itemIds).toContain('copyPath')
        expect(itemIds).toContain('download')

        // 验证不包含文件夹特有的菜单项
        expect(itemIds).not.toContain('newFile')
        expect(itemIds).not.toContain('newFolder')
        expect(itemIds).not.toContain('upload')

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should generate all required menu items for directories', () => {
    fc.assert(
      fc.property(directoryItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        // 验证文件夹菜单包含所有必需项
        const requiredIds = getRequiredFolderMenuItems()
        const isValid = validateMenuItems(items, requiredIds)

        expect(isValid).toBe(true)
        expect(items.length).toBe(requiredIds.length)

        // 验证每个必需项都存在
        const itemIds = items.map((item) => item.id)
        expect(itemIds).toContain('open')
        expect(itemIds).toContain('newFile')
        expect(itemIds).toContain('newFolder')
        expect(itemIds).toContain('rename')
        expect(itemIds).toContain('delete')
        expect(itemIds).toContain('copyPath')
        expect(itemIds).toContain('upload')

        // 验证不包含文件特有的菜单项
        expect(itemIds).not.toContain('edit')
        expect(itemIds).not.toContain('download')

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should mark delete item as danger for all file types', () => {
    const anyFileItemArb = fc.oneof(fileItemArb, directoryItemArb)

    fc.assert(
      fc.property(anyFileItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        const deleteItem = items.find((item) => item.id === 'delete')
        expect(deleteItem).toBeDefined()
        expect(deleteItem?.danger).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have unique ids for all menu items', () => {
    const anyFileItemArb = fc.oneof(fileItemArb, directoryItemArb)

    fc.assert(
      fc.property(anyFileItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        const ids = items.map((item) => item.id)
        const uniqueIds = new Set(ids)

        // 所有 ID 应该是唯一的
        expect(uniqueIds.size).toBe(ids.length)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have non-empty labels for all menu items', () => {
    const anyFileItemArb = fc.oneof(fileItemArb, directoryItemArb)

    fc.assert(
      fc.property(anyFileItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        // 所有菜单项应该有非空标签
        items.forEach((item) => {
          expect(item.label).toBeDefined()
          expect(item.label.length).toBeGreaterThan(0)
        })

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have callable onClick handlers for all menu items', () => {
    const anyFileItemArb = fc.oneof(fileItemArb, directoryItemArb)

    fc.assert(
      fc.property(anyFileItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        // 所有菜单项应该有可调用的 onClick 处理函数
        items.forEach((item) => {
          expect(typeof item.onClick).toBe('function')
        })

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should treat symlinks the same as files for menu generation', () => {
    const symlinkItemArb: fc.Arbitrary<FileItem> = fc.record({
      name: fileNameArb,
      path: filePathArb,
      type: fc.constant('symlink') as fc.Arbitrary<'symlink'>,
      size: fileSizeArb,
      modifiedTime: fc.date(),
      permissions: permissionsArb,
    })

    fc.assert(
      fc.property(symlinkItemArb, (file: FileItem) => {
        const callbacks = createMockCallbacks()
        const items = generateContextMenuItems({ file, ...callbacks })

        // 符号链接应该和文件有相同的菜单项
        const requiredIds = getRequiredFileMenuItems()
        const isValid = validateMenuItems(items, requiredIds)

        expect(isValid).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })
})
