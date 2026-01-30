import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Frontend Test Setup', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should run property-based test with fast-check', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a
      }),
      { numRuns: 100 }
    )
  })
})
