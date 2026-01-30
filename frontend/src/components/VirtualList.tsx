import { useRef, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'

interface VirtualListProps<T> {
  /** 数据项列表 */
  items: T[]
  /** 每项的高度（像素） */
  itemHeight: number
  /** 容器高度（像素），如果不提供则自动计算 */
  containerHeight?: number
  /** 渲染单个项的函数 */
  renderItem: (item: T, index: number) => ReactNode
  /** 额外渲染的项数（上下各多渲染几项以平滑滚动） */
  overscan?: number
  /** 自定义类名 */
  className?: string
  /** 空列表时显示的内容 */
  emptyContent?: ReactNode
  /** 获取项的唯一键 */
  getKey?: (item: T, index: number) => string | number
}

/**
 * 虚拟滚动列表组件
 * 用于高效渲染大量数据项，只渲染可见区域内的项
 * Requirements: 7.3 - 文件管理器加载包含 1000 个文件的目录在 2 秒内完成渲染
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight: propContainerHeight,
  renderItem,
  overscan = 3,
  className = '',
  emptyContent,
  getKey,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(propContainerHeight || 400)

  // 更新容器高度
  useEffect(() => {
    if (propContainerHeight) {
      setContainerHeight(propContainerHeight)
      return
    }

    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerHeight(rect.height || 400)
      }
    }

    updateHeight()
    
    const resizeObserver = new ResizeObserver(updateHeight)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [propContainerHeight])

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // 计算可见范围
  const { startIndex, visibleItems, offsetY } = useMemo(() => {
    const totalHeight = items.length * itemHeight
    
    // 计算起始和结束索引
    let start = Math.floor(scrollTop / itemHeight)
    let end = Math.ceil((scrollTop + containerHeight) / itemHeight)
    
    // 添加 overscan
    start = Math.max(0, start - overscan)
    end = Math.min(items.length, end + overscan)
    
    // 获取可见项
    const visible = items.slice(start, end)
    
    // 计算偏移量
    const offset = start * itemHeight
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: visible,
      offsetY: offset,
      totalHeight,
    }
  }, [items, itemHeight, scrollTop, containerHeight, overscan])

  // 总高度
  const totalHeight = items.length * itemHeight

  // 空列表
  if (items.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center ${className}`}>
        {emptyContent || <span className="text-text-secondary">暂无数据</span>}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      style={{ height: propContainerHeight || '100%' }}
    >
      {/* 占位容器，用于撑开滚动区域 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见项容器 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index
            const key = getKey ? getKey(item, actualIndex) : actualIndex
            return (
              <div
                key={key}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * 计算虚拟列表的可见范围
 * 纯函数，用于测试
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { startIndex: number; endIndex: number; offsetY: number } {
  if (totalItems === 0 || containerHeight <= 0 || itemHeight <= 0) {
    return { startIndex: 0, endIndex: 0, offsetY: 0 }
  }

  let start = Math.floor(scrollTop / itemHeight)
  let end = Math.ceil((scrollTop + containerHeight) / itemHeight)
  
  // 添加 overscan
  start = Math.max(0, start - overscan)
  end = Math.min(totalItems, end + overscan)
  
  const offsetY = start * itemHeight
  
  return { startIndex: start, endIndex: end, offsetY }
}

export default VirtualList
