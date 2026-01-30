import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  calculateResponsiveLayout,
  isValidLayoutConfig,
  type ResponsiveLayoutConfig,
} from '../SplitLayout'

// 屏幕尺寸生成器
const screenWidthArb = fc.integer({ min: 1, max: 4000 })
const screenHeightArb = fc.integer({ min: 1, max: 3000 })

// 移动端屏幕宽度 (< 768px)
const mobileWidthArb = fc.integer({ min: 1, max: 767 })

// 平板屏幕宽度 (768px - 1023px)
const tabletWidthArb = fc.integer({ min: 768, max: 1023 })

// 桌面端屏幕宽度 (>= 1024px)
const desktopWidthArb = fc.integer({ min: 1024, max: 4000 })

/**
 * **Feature: web-ssh-terminal, Property 9: 响应式布局适配正确性**
 * **Validates: Requirements 8.3**
 * 
 * *For any* 屏幕尺寸，布局计算函数应该返回有效的布局配置，确保所有组件都在可见区域内。
 */
describe('Property 9: 响应式布局适配正确性', () => {
  it('should return valid layout config for any screen size', () => {
    fc.assert(
      fc.property(screenWidthArb, screenHeightArb, (width: number, height: number) => {
        const config = calculateResponsiveLayout(width, height)
        
        // 配置应该有效
        expect(isValidLayoutConfig(config)).toBe(true)
        
        // 比例范围应该有效
        expect(config.minRatio).toBeGreaterThanOrEqual(0)
        expect(config.maxRatio).toBeLessThanOrEqual(1)
        expect(config.minRatio).toBeLessThanOrEqual(config.maxRatio)
        expect(config.defaultRatio).toBeGreaterThanOrEqual(config.minRatio)
        expect(config.defaultRatio).toBeLessThanOrEqual(config.maxRatio)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return mobile config for small screens', () => {
    fc.assert(
      fc.property(mobileWidthArb, screenHeightArb, (width: number, height: number) => {
        const config = calculateResponsiveLayout(width, height)
        
        // 移动端配置
        expect(config.isMobile).toBe(true)
        expect(config.isTablet).toBe(false)
        expect(config.isDesktop).toBe(false)
        expect(config.showSidebar).toBe(false)
        expect(config.stackLayout).toBe(true)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return tablet config for medium screens', () => {
    fc.assert(
      fc.property(tabletWidthArb, screenHeightArb, (width: number, height: number) => {
        const config = calculateResponsiveLayout(width, height)
        
        // 平板配置
        expect(config.isMobile).toBe(false)
        expect(config.isTablet).toBe(true)
        expect(config.isDesktop).toBe(false)
        expect(config.showSidebar).toBe(true)
        expect(config.stackLayout).toBe(false)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should return desktop config for large screens', () => {
    fc.assert(
      fc.property(desktopWidthArb, screenHeightArb, (width: number, height: number) => {
        const config = calculateResponsiveLayout(width, height)
        
        // 桌面端配置
        expect(config.isMobile).toBe(false)
        expect(config.isTablet).toBe(false)
        expect(config.isDesktop).toBe(true)
        expect(config.showSidebar).toBe(true)
        expect(config.stackLayout).toBe(false)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should have exactly one device type true', () => {
    fc.assert(
      fc.property(screenWidthArb, screenHeightArb, (width: number, height: number) => {
        const config = calculateResponsiveLayout(width, height)
        
        // 只有一个设备类型为 true
        const deviceTypes = [config.isMobile, config.isTablet, config.isDesktop]
        const trueCount = deviceTypes.filter(Boolean).length
        expect(trueCount).toBe(1)
        
        return true
      }),
      { numRuns: 100 }
    )
  })

  it('should handle edge case screen sizes', () => {
    // 边界值测试
    const edgeCases = [
      { width: 1, height: 1 },
      { width: 767, height: 500 },
      { width: 768, height: 500 },
      { width: 1023, height: 500 },
      { width: 1024, height: 500 },
      { width: 4000, height: 3000 },
    ]
    
    for (const { width, height } of edgeCases) {
      const config = calculateResponsiveLayout(width, height)
      expect(isValidLayoutConfig(config)).toBe(true)
    }
  })

  it('should validate layout config correctly', () => {
    // 有效配置
    const validConfig: ResponsiveLayoutConfig = {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      defaultRatio: 0.3,
      minRatio: 0.1,
      maxRatio: 0.9,
      showSidebar: true,
      stackLayout: false,
    }
    expect(isValidLayoutConfig(validConfig)).toBe(true)
    
    // 无效配置：多个设备类型为 true
    const invalidMultiDevice: ResponsiveLayoutConfig = {
      ...validConfig,
      isMobile: true,
      isDesktop: true,
    }
    expect(isValidLayoutConfig(invalidMultiDevice)).toBe(false)
    
    // 无效配置：minRatio > maxRatio
    const invalidRatioRange: ResponsiveLayoutConfig = {
      ...validConfig,
      minRatio: 0.9,
      maxRatio: 0.1,
    }
    expect(isValidLayoutConfig(invalidRatioRange)).toBe(false)
    
    // 无效配置：defaultRatio 超出范围
    const invalidDefaultRatio: ResponsiveLayoutConfig = {
      ...validConfig,
      defaultRatio: 0.95,
    }
    expect(isValidLayoutConfig(invalidDefaultRatio)).toBe(false)
    
    // 无效配置：移动端显示侧边栏
    const invalidMobileSidebar: ResponsiveLayoutConfig = {
      ...validConfig,
      isMobile: true,
      isDesktop: false,
      showSidebar: true,
    }
    expect(isValidLayoutConfig(invalidMobileSidebar)).toBe(false)
  })
})
