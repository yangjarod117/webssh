import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateTransferProgress, detectFileConflict } from '../FileTransfer'
import type { FileItem } from '../../types'

/**
 * **Feature: web-ssh-terminal, Property 10: 传输进度计算正确性**
 * **Validates: Requirements 9.3, 9.5**
 *
 * *For any* 已传输字节数和总字节数（总字节数 > 0），进度百分比应该在 0-100 之间，
 * 且当已传输等于总字节数时，进度应该为 100。
 */
describe('Property 10: 传输进度计算正确性', () => {
  // 正整数生成器
  const positiveBytesArb = fc.integer({ min: 1, max: 1000000000 })
  const nonNegativeBytesArb = fc.integer({ min: 0, max: 1000000000 })

  it('should return percentage between 0 and 100 for valid inputs', () => {
    fc.assert(
      fc.property(
        nonNegativeBytesArb,
        positiveBytesArb,
        (transferred: number, total: number) => {
          const percentage = calculateTransferProgress(transferred, total)

          // 进度应该在 0-100 之间
          expect(percentage).toBeGreaterThanOrEqual(0)
          expect(percentage).toBeLessThanOrEqual(100)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 100 when transferred equals total', () => {
    fc.assert(
      fc.property(positiveBytesArb, (total: number) => {
        const percentage = calculateTransferProgress(total, total)

        // 当已传输等于总字节数时，进度应该为 100
        expect(percentage).toBe(100)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0 when transferred is 0', () => {
    fc.assert(
      fc.property(positiveBytesArb, (total: number) => {
        const percentage = calculateTransferProgress(0, total)

        // 当已传输为 0 时，进度应该为 0
        expect(percentage).toBe(0)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return 0 when total is 0 or negative', () => {
    fc.assert(
      fc.property(
        nonNegativeBytesArb,
        fc.integer({ min: -1000, max: 0 }),
        (transferred: number, total: number) => {
          const percentage = calculateTransferProgress(transferred, total)

          // 当总字节数为 0 或负数时，进度应该为 0
          expect(percentage).toBe(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should cap at 100 when transferred exceeds total', () => {
    fc.assert(
      fc.property(
        positiveBytesArb,
        fc.integer({ min: 1, max: 1000 }),
        (total: number, extra: number) => {
          const transferred = total + extra
          const percentage = calculateTransferProgress(transferred, total)

          // 当已传输超过总字节数时，进度应该为 100
          expect(percentage).toBe(100)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should be monotonically increasing as transferred increases', () => {
    fc.assert(
      fc.property(
        positiveBytesArb,
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 10 }),
        (total: number, percentages: number[]) => {
          // 按百分比排序
          const sortedPercentages = [...percentages].sort((a, b) => a - b)
          const transferredValues = sortedPercentages.map((p) =>
            Math.floor((p / 100) * total)
          )

          // 计算进度
          const progressValues = transferredValues.map((t) =>
            calculateTransferProgress(t, total)
          )

          // 进度应该是单调递增的
          for (let i = 1; i < progressValues.length; i++) {
            expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1])
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return a number with at most one decimal place', () => {
    fc.assert(
      fc.property(
        nonNegativeBytesArb,
        positiveBytesArb,
        (transferred: number, total: number) => {
          const percentage = calculateTransferProgress(transferred, total)

          // 检查小数位数
          const decimalPlaces = (percentage.toString().split('.')[1] || '').length
          expect(decimalPlaces).toBeLessThanOrEqual(1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * **Feature: web-ssh-terminal, Property 11: 文件冲突检测正确性**
 * **Validates: Requirements 9.8**
 *
 * *For any* 文件列表和上传文件名，冲突检测函数应该正确识别同名文件是否存在。
 */
describe('Property 11: 文件冲突检测正确性', () => {
  // 文件名生成器
  const fileNameArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-'.split('')),
    { minLength: 1, maxLength: 50 }
  )

  // 文件项生成器
  const fileItemArb: fc.Arbitrary<FileItem> = fc.record({
    name: fileNameArb,
    path: fc.constant('/test'),
    type: fc.constantFrom('file', 'directory', 'symlink') as fc.Arbitrary<
      'file' | 'directory' | 'symlink'
    >,
    size: fc.integer({ min: 0, max: 1000000 }),
    modifiedTime: fc.date(),
    permissions: fc.constant('rwxr-xr-x'),
  })

  // 文件列表生成器
  const fileListArb = fc.array(fileItemArb, { minLength: 0, maxLength: 20 })

  it('should return true when file with same name exists (case-insensitive)', () => {
    fc.assert(
      fc.property(fileListArb, (files: FileItem[]) => {
        if (files.length === 0) return true

        // 选择一个已存在的文件名
        const existingFile = files[0]
        const uploadName = existingFile.name

        const hasConflict = detectFileConflict(files, uploadName)
        expect(hasConflict).toBe(true)

        // 测试大小写不敏感
        const upperCaseName = uploadName.toUpperCase()
        const hasConflictUpper = detectFileConflict(files, upperCaseName)
        expect(hasConflictUpper).toBe(true)

        const lowerCaseName = uploadName.toLowerCase()
        const hasConflictLower = detectFileConflict(files, lowerCaseName)
        expect(hasConflictLower).toBe(true)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return false when no file with same name exists', () => {
    fc.assert(
      fc.property(fileListArb, fileNameArb, (files: FileItem[], uploadName: string) => {
        // 确保上传文件名不在列表中
        const filteredFiles = files.filter(
          (f) => f.name.toLowerCase() !== uploadName.toLowerCase()
        )

        const hasConflict = detectFileConflict(filteredFiles, uploadName)
        expect(hasConflict).toBe(false)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return false for empty file list', () => {
    fc.assert(
      fc.property(fileNameArb, (uploadName: string) => {
        const hasConflict = detectFileConflict([], uploadName)
        expect(hasConflict).toBe(false)

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should detect conflict regardless of file type', () => {
    fc.assert(
      fc.property(
        fileNameArb,
        fc.constantFrom('file', 'directory', 'symlink') as fc.Arbitrary<
          'file' | 'directory' | 'symlink'
        >,
        (name: string, type: 'file' | 'directory' | 'symlink') => {
          const files: FileItem[] = [
            {
              name,
              path: `/test/${name}`,
              type,
              size: 100,
              modifiedTime: new Date(),
              permissions: 'rwxr-xr-x',
            },
          ]

          const hasConflict = detectFileConflict(files, name)
          expect(hasConflict).toBe(true)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle special characters in file names', () => {
    const specialNameArb = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-()[]{}!@#$%^&'.split('')),
      { minLength: 1, maxLength: 30 }
    )

    fc.assert(
      fc.property(specialNameArb, (name: string) => {
        const files: FileItem[] = [
          {
            name,
            path: `/test/${name}`,
            type: 'file',
            size: 100,
            modifiedTime: new Date(),
            permissions: 'rwxr-xr-x',
          },
        ]

        // 同名应该检测到冲突
        const hasConflict = detectFileConflict(files, name)
        expect(hasConflict).toBe(true)

        // 不同名不应该检测到冲突
        const differentName = name + '_different'
        const noConflict = detectFileConflict(files, differentName)
        expect(noConflict).toBe(false)

        return true
      }),
      { numRuns: 100 }
    )
  })
})
