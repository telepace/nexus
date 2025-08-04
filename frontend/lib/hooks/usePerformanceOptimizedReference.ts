import { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { useReferenceStore } from '@/lib/stores/referenceStore'

/**
 * 🚀 性能优化的引用 Hook
 * 
 * 设计理念：
 * - 虚拟滚动优化
 * - 智能预加载策略
 * - 内存池管理
 * - 帧率优化调度
 * - 渐进式降级
 */

export interface PerformanceOptimizedReferenceOptions {
  contentId: string
  
  // 虚拟化配置
  enableVirtualization?: boolean
  viewportHeight?: number
  itemHeight?: number
  overscan?: number
  
  // 预加载配置
  enablePreloading?: boolean
  preloadRadius?: number
  preloadThreshold?: number
  
  // 内存管理
  enableMemoryPool?: boolean
  maxPoolSize?: number
  gcThreshold?: number
  
  // 性能配置
  enableFrameScheduling?: boolean
  maxFrameTime?: number
  enableBatching?: boolean
  batchSize?: number
  
  // 监控配置
  enablePerformanceMonitoring?: boolean
  
  debug?: boolean
}

interface VirtualItem {
  index: number
  refId: number
  top: number
  height: number
  isVisible: boolean
  isPreloaded: boolean
}

interface PerformanceMetrics {
  frameRate: number
  memoryUsage: number
  cacheHitRate: number
  renderTime: number
  scrollPerformance: number
}

interface MemoryPoolItem {
  id: string
  data: any
  lastAccessed: number
  accessCount: number
  size: number
}

export const usePerformanceOptimizedReference = (options: PerformanceOptimizedReferenceOptions) => {
  const {
    contentId,
    enableVirtualization = true,
    viewportHeight = 600,
    itemHeight = 50,
    overscan = 5,
    enablePreloading = true,
    preloadRadius = 3,
    preloadThreshold = 100,
    enableMemoryPool = true,
    maxPoolSize = 1000,
    gcThreshold = 0.8,
    enableFrameScheduling = true,
    maxFrameTime = 16, // 60fps
    enableBatching = true,
    batchSize = 10,
    enablePerformanceMonitoring = true,
    debug = false,
  } = options

  // 状态管理
  const [virtualItems, setVirtualItems] = useState<VirtualItem[]>([])
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameRate: 60,
    memoryUsage: 0,
    cacheHitRate: 0,
    renderTime: 0,
    scrollPerformance: 100
  })

  // Refs
  const containerRef = useRef<HTMLElement | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const memoryPool = useRef<Map<string, MemoryPoolItem>>(new Map())
  const frameScheduler = useRef<{
    tasks: Array<() => void>
    isRunning: boolean
    currentFrameTime: number
  }>({
    tasks: [],
    isRunning: false,
    currentFrameTime: 0
  })
  const performanceObserver = useRef<{
    frameCount: number
    lastFrameTime: number
    renderTimes: number[]
  }>({
    frameCount: 0,
    lastFrameTime: performance.now(),
    renderTimes: []
  })

  // Store hooks
  const { getCachedContent, setCachedContent } = useReferenceStore()

  // 调试日志
  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[PerformanceOptimizedReference] ${message}`, data || '')
    }
  }, [debug])

  // 内存池管理
  const memoryPoolManager = useMemo(() => ({
    get: (id: string) => {
      const item = memoryPool.current.get(id)
      if (item) {
        item.lastAccessed = Date.now()
        item.accessCount++
        return item.data
      }
      return null
    },

    set: (id: string, data: any) => {
      const size = JSON.stringify(data).length
      const item: MemoryPoolItem = {
        id,
        data,
        lastAccessed: Date.now(),
        accessCount: 1,
        size
      }

      // 检查是否需要垃圾回收
      if (memoryPool.current.size >= maxPoolSize * gcThreshold) {
        this.gc()
      }

      memoryPool.current.set(id, item)
      log('内存池添加项', { id, size })
    },

    gc: () => {
      const items = Array.from(memoryPool.current.values())
      const sortedItems = items.sort((a, b) => {
        // 基于最后访问时间和访问频率的复合分数
        const scoreA = a.lastAccessed + (a.accessCount * 10000)
        const scoreB = b.lastAccessed + (b.accessCount * 10000)
        return scoreA - scoreB
      })

      // 移除最不常用的项目
      const toRemove = Math.floor(memoryPool.current.size * 0.3)
      for (let i = 0; i < toRemove; i++) {
        memoryPool.current.delete(sortedItems[i].id)
      }

      log('内存池垃圾回收', { 
        removed: toRemove, 
        remaining: memoryPool.current.size 
      })
    },

    getStats: () => {
      const items = Array.from(memoryPool.current.values())
      const totalSize = items.reduce((sum, item) => sum + item.size, 0)
      const avgAccessCount = items.reduce((sum, item) => sum + item.accessCount, 0) / items.length
      
      return {
        totalItems: items.length,
        totalSize,
        avgAccessCount,
        hitRate: avgAccessCount / (avgAccessCount + 1) // 简化的命中率计算
      }
    }
  }), [maxPoolSize, gcThreshold, log])

  // 帧调度器
  const frameSchedulerManager = useMemo(() => ({
    schedule: (task: () => void) => {
      if (!enableFrameScheduling) {
        task()
        return
      }

      frameScheduler.current.tasks.push(task)
      
      if (!frameScheduler.current.isRunning) {
        this.run()
      }
    },

    run: () => {
      frameScheduler.current.isRunning = true
      
      const processFrame = () => {
        const frameStart = performance.now()
        frameScheduler.current.currentFrameTime = frameStart

        // 执行任务直到帧时间预算用完
        while (
          frameScheduler.current.tasks.length > 0 && 
          performance.now() - frameStart < maxFrameTime
        ) {
          const task = frameScheduler.current.tasks.shift()
          if (task) {
            try {
              task()
            } catch (error) {
              console.error('Frame task error:', error)
            }
          }
        }

        // 更新性能指标
        const frameTime = performance.now() - frameStart
        performanceObserver.current.renderTimes.push(frameTime)
        if (performanceObserver.current.renderTimes.length > 60) {
          performanceObserver.current.renderTimes.shift()
        }

        // 如果还有任务，继续下一帧
        if (frameScheduler.current.tasks.length > 0) {
          requestAnimationFrame(processFrame)
        } else {
          frameScheduler.current.isRunning = false
        }
      }

      requestAnimationFrame(processFrame)
    }
  }), [enableFrameScheduling, maxFrameTime])

  // 虚拟化计算
  const calculateVirtualItems = useCallback((
    totalItems: number,
    scrollTop: number,
    viewportHeight: number
  ): VirtualItem[] => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      totalItems - 1,
      startIndex + Math.ceil(viewportHeight / itemHeight) + overscan
    )

    const items: VirtualItem[] = []
    
    for (let i = Math.max(0, startIndex - overscan); i <= endIndex; i++) {
      items.push({
        index: i,
        refId: i + 1, // 简化的 refId 计算
        top: i * itemHeight,
        height: itemHeight,
        isVisible: i >= startIndex && i <= endIndex - overscan,
        isPreloaded: false
      })
    }

    return items
  }, [itemHeight, overscan])

  // 预加载逻辑
  const preloadReferences = useCallback((items: VirtualItem[]) => {
    if (!enablePreloading) return

    const preloadTasks = items
      .filter(item => item.isVisible)
      .map(item => {
        // 预加载周围的引用
        const preloadRange = []
        for (let i = -preloadRadius; i <= preloadRadius; i++) {
          const targetRefId = item.refId + i
          if (targetRefId > 0) {
            preloadRange.push(targetRefId)
          }
        }
        return preloadRange
      })
      .flat()

    // 批量预加载
    if (enableBatching) {
      for (let i = 0; i < preloadTasks.length; i += batchSize) {
        const batch = preloadTasks.slice(i, i + batchSize)
        
        frameSchedulerManager.schedule(() => {
          batch.forEach(refId => {
            const cacheKey = `${contentId}-${refId}`
            
            // 检查内存池
            let cachedData = memoryPoolManager.get(cacheKey)
            
            if (!cachedData) {
              // 检查 Store 缓存
              cachedData = getCachedContent(cacheKey)
              
              if (cachedData) {
                memoryPoolManager.set(cacheKey, cachedData)
              }
            }
          })
        })
      }
    }
  }, [
    enablePreloading,
    preloadRadius,
    enableBatching,
    batchSize,
    contentId,
    frameSchedulerManager,
    memoryPoolManager,
    getCachedContent
  ])

  // 滚动处理
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement
    const newScrollTop = target.scrollTop

    setScrollTop(newScrollTop)
    setIsScrolling(true)

    // 清除之前的滚动超时
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // 设置滚动结束检测
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
      log('滚动结束')
    }, 150)

    // 性能监控
    if (enablePerformanceMonitoring) {
      const scrollStart = performance.now()
      
      frameSchedulerManager.schedule(() => {
        const scrollTime = performance.now() - scrollStart
        
        setPerformanceMetrics(prev => ({
          ...prev,
          scrollPerformance: Math.max(0, 100 - scrollTime)
        }))
      })
    }

    log('滚动事件', { scrollTop: newScrollTop })
  }, [frameSchedulerManager, enablePerformanceMonitoring, log])

  // 更新虚拟项目
  useEffect(() => {
    if (!enableVirtualization) return

    const totalItems = 100 // 模拟总项目数，实际应从数据源获取
    
    frameSchedulerManager.schedule(() => {
      const newVirtualItems = calculateVirtualItems(totalItems, scrollTop, viewportHeight)
      setVirtualItems(newVirtualItems)
      
      const startIndex = Math.floor(scrollTop / itemHeight)
      const endIndex = startIndex + Math.ceil(viewportHeight / itemHeight)
      setVisibleRange({ start: startIndex, end: endIndex })
      
      // 触发预加载
      preloadReferences(newVirtualItems)
    })
  }, [
    enableVirtualization,
    scrollTop,
    viewportHeight,
    itemHeight,
    calculateVirtualItems,
    preloadReferences,
    frameSchedulerManager
  ])

  // 性能监控
  useEffect(() => {
    if (!enablePerformanceMonitoring) return

    const updateMetrics = () => {
      const now = performance.now()
      const deltaTime = now - performanceObserver.current.lastFrameTime
      
      if (deltaTime >= 1000) { // 每秒更新一次
        const frameRate = performanceObserver.current.frameCount / (deltaTime / 1000)
        const avgRenderTime = performanceObserver.current.renderTimes.reduce((a, b) => a + b, 0) / 
                             performanceObserver.current.renderTimes.length || 0
        
        const memoryStats = memoryPoolManager.getStats()
        
        setPerformanceMetrics(prev => ({
          ...prev,
          frameRate: Math.round(frameRate),
          memoryUsage: memoryStats.totalSize,
          cacheHitRate: memoryStats.hitRate * 100,
          renderTime: avgRenderTime
        }))

        performanceObserver.current.frameCount = 0
        performanceObserver.current.lastFrameTime = now
        performanceObserver.current.renderTimes = []
      } else {
        performanceObserver.current.frameCount++
      }

      requestAnimationFrame(updateMetrics)
    }

    const animationId = requestAnimationFrame(updateMetrics)
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [enablePerformanceMonitoring, memoryPoolManager])

  // 设置容器引用
  const setContainerRef = useCallback((element: HTMLElement | null) => {
    if (containerRef.current) {
      containerRef.current.removeEventListener('scroll', handleScroll)
    }

    containerRef.current = element

    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true })
    }
  }, [handleScroll])

  // 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll)
      }
    }
  }, [handleScroll])

  // 获取可见引用
  const getVisibleReferences = useCallback(() => {
    return virtualItems.filter(item => item.isVisible)
  }, [virtualItems])

  // 手动触发垃圾回收
  const triggerGC = useCallback(() => {
    memoryPoolManager.gc()
  }, [memoryPoolManager])

  // 获取性能建议
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = []
    
    if (performanceMetrics.frameRate < 30) {
      recommendations.push('考虑减少动画复杂度或启用性能模式')
    }
    
    if (performanceMetrics.memoryUsage > maxPoolSize * 0.8) {
      recommendations.push('建议清理内存缓存或增加垃圾回收频率')
    }
    
    if (performanceMetrics.cacheHitRate < 60) {
      recommendations.push('考虑调整预加载策略以提高缓存命中率')
    }
    
    if (performanceMetrics.renderTime > maxFrameTime) {
      recommendations.push('渲染时间过长，建议启用帧调度或减少批处理大小')
    }

    return recommendations
  }, [performanceMetrics, maxPoolSize, maxFrameTime])

  return {
    // 虚拟化数据
    virtualItems,
    visibleRange,
    totalHeight: virtualItems.length * itemHeight,
    
    // 状态
    isScrolling,
    scrollTop,
    
    // 性能指标
    performanceMetrics,
    
    // 方法
    setContainerRef,
    getVisibleReferences,
    triggerGC,
    getPerformanceRecommendations,
    
    // 内存池统计
    memoryPoolStats: memoryPoolManager.getStats(),
    
    // 调试信息
    debugInfo: debug ? {
      virtualItems: virtualItems.length,
      visibleItems: virtualItems.filter(item => item.isVisible).length,
      memoryPoolSize: memoryPool.current.size,
      scheduledTasks: frameScheduler.current.tasks.length,
      performanceMetrics
    } : undefined
  }
}

export default usePerformanceOptimizedReference