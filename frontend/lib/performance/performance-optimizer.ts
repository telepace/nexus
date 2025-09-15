/**
 * 前端性能优化工具集
 * 包含代码分割、懒加载、缓存策略等优化功能
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

// ============================================================================
// 1. 智能代码分割和懒加载
// ============================================================================

interface LazyComponentCache {
  [key: string]: React.ComponentType<any>
}

class ComponentLazyLoader {
  private static cache: LazyComponentCache = {}
  private static loadingPromises: { [key: string]: Promise<any> } = {}

  /**
   * 智能懒加载组件，支持预加载和缓存
   */
  static lazy<T = any>(
    importFn: () => Promise<{ default: React.ComponentType<T> }>,
    options: {
      preload?: boolean
      cacheKey?: string
      fallback?: React.ComponentType
    } = {}
  ) {
    const { preload = false, cacheKey } = options
    const key = cacheKey || importFn.toString()

    // 如果已缓存，直接返回
    if (this.cache[key]) {
      return this.cache[key]
    }

    // 创建懒加载组件
    const LazyComponent = React.lazy(() => {
      // 避免重复加载
      if (!this.loadingPromises[key]) {
        this.loadingPromises[key] = importFn().then((module) => {
          this.cache[key] = module.default
          delete this.loadingPromises[key]
          return module
        })
      }
      return this.loadingPromises[key]
    })

    // 预加载逻辑
    if (preload) {
      this.preloadComponent(importFn, key)
    }

    return LazyComponent
  }

  /**
   * 预加载组件
   */
  private static async preloadComponent(
    importFn: () => Promise<any>,
    key: string
  ) {
    if (!this.cache[key] && !this.loadingPromises[key]) {
      try {
        const module = await importFn()
        this.cache[key] = module.default
      } catch (error) {
        console.warn(`预加载组件失败: ${key}`, error)
      }
    }
  }

  /**
   * 批量预加载组件
   */
  static preloadComponents(components: Array<() => Promise<any>>) {
    components.forEach((importFn, index) => {
      const key = `preload_${index}`
      this.preloadComponent(importFn, key)
    })
  }
}

// ============================================================================
// 2. 智能状态管理和缓存
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  stale: boolean
}

interface CacheState {
  entries: { [key: string]: CacheEntry<any> }
  set: <T>(key: string, data: T, ttl?: number) => void
  get: <T>(key: string) => T | null
  invalidate: (key: string) => void
  clear: () => void
  isStale: (key: string) => boolean
  cleanup: () => void
}

export const useAppCache = create<CacheState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        entries: {},
        
        set: <T>(key: string, data: T, ttl: number = 5 * 60 * 1000) => {
          set((state) => ({
            entries: {
              ...state.entries,
              [key]: {
                data,
                timestamp: Date.now(),
                ttl,
                stale: false
              }
            }
          }))
        },
        
        get: <T>(key: string): T | null => {
          const entry = get().entries[key]
          if (!entry) return null
          
          const now = Date.now()
          const isExpired = now - entry.timestamp > entry.ttl
          
          if (isExpired) {
            get().invalidate(key)
            return null
          }
          
          return entry.data as T
        },
        
        invalidate: (key: string) => {
          set((state) => {
            const newEntries = { ...state.entries }
            delete newEntries[key]
            return { entries: newEntries }
          })
        },
        
        clear: () => set({ entries: {} }),
        
        isStale: (key: string) => {
          const entry = get().entries[key]
          if (!entry) return true
          return Date.now() - entry.timestamp > entry.ttl * 0.8 // 80%时间后视为stale
        },
        
        cleanup: () => {
          const now = Date.now()
          set((state) => {
            const validEntries = Object.fromEntries(
              Object.entries(state.entries).filter(
                ([_, entry]) => now - entry.timestamp <= entry.ttl
              )
            )
            return { entries: validEntries }
          })
        }
      }),
      {
        name: 'app-cache',
        partialize: (state) => ({ entries: state.entries })
      }
    )
  )
)

// ============================================================================
// 3. 性能监控和优化Hooks
// ============================================================================

/**
 * 防抖Hook - 优化频繁更新
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 节流Hook - 限制执行频率
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const throttledFn = useRef<T>()
  const lastExecuted = useRef<number>(0)

  throttledFn.current = useCallback(
    ((...args) => {
      const now = Date.now()
      if (now - lastExecuted.current >= delay) {
        lastExecuted.current = now
        return fn(...args)
      }
    }) as T,
    [fn, delay]
  )

  return throttledFn.current!
}

/**
 * 虚拟列表Hook - 优化大列表渲染
 */
export function useVirtualList<T>(
  items: T[],
  options: {
    itemHeight: number
    containerHeight: number
    overscan?: number
  }
) {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    startIndex + visibleCount + overscan * 2
  )

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, startIndex, endIndex])

  const totalHeight = items.length * itemHeight

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, 16) // 60fps

  return {
    visibleItems,
    totalHeight,
    startIndex,
    handleScroll,
    containerProps: {
      style: { height: containerHeight, overflow: 'auto' },
      onScroll: handleScroll
    }
  }
}

/**
 * 图片懒加载Hook
 */
export function useLazyImage(src: string) {
  const [imageSrc, setImageSrc] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    let observer: IntersectionObserver

    if (imgRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsLoading(true)
            const img = new Image()
            
            img.onload = () => {
              setImageSrc(src)
              setIsLoading(false)
            }
            
            img.onerror = () => {
              setError('Failed to load image')
              setIsLoading(false)
            }
            
            img.src = src
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )

      observer.observe(imgRef.current)
    }

    return () => observer?.disconnect()
  }, [src])

  return { imageSrc, isLoading, error, imgRef }
}

// ============================================================================
// 4. Bundle优化工具
// ============================================================================

/**
 * 动态导入工具
 */
export class DynamicImporter {
  private static cache = new Map<string, Promise<any>>()

  /**
   * 缓存动态导入
   */
  static async import<T>(
    modulePath: string, 
    importFn: () => Promise<T>
  ): Promise<T> {
    if (this.cache.has(modulePath)) {
      return this.cache.get(modulePath)!
    }

    const promise = importFn()
    this.cache.set(modulePath, promise)
    
    try {
      const module = await promise
      return module
    } catch (error) {
      this.cache.delete(modulePath)
      throw error
    }
  }

  /**
   * 预加载关键模块
   */
  static preloadCriticalModules() {
    // 预加载关键路由组件
    const criticalImports = [
      () => import('../components/layout/AppSidebar'),
      () => import('../components/ai/AnalysisCards'),
      () => import('../(withSidebar)/content-library/components/ContentCard')
    ]

    ComponentLazyLoader.preloadComponents(criticalImports)
  }
}

// ============================================================================
// 5. 性能监控和分析
// ============================================================================

interface PerformanceMetrics {
  renderTime: number
  memoryUsage?: number
  componentCounts: number
  lastUpdated: number
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetrics> = new Map()
  private static observers: PerformanceObserver[] = []

  /**
   * 监控组件渲染性能
   */
  static measureComponent(componentName: string) {
    return function <T extends React.ComponentType<any>>(Component: T): T {
      const MeasuredComponent = React.memo((props: any) => {
        const renderStart = performance.now()
        
        useEffect(() => {
          const renderEnd = performance.now()
          const renderTime = renderEnd - renderStart
          
          PerformanceMonitor.updateMetrics(componentName, {
            renderTime,
            componentCounts: 1,
            lastUpdated: Date.now()
          })
        })

        return React.createElement(Component, props)
      })

      MeasuredComponent.displayName = `Measured(${Component.displayName || Component.name})`
      return MeasuredComponent as T
    }
  }

  /**
   * 更新性能指标
   */
  private static updateMetrics(name: string, metrics: Partial<PerformanceMetrics>) {
    const existing = this.metrics.get(name) || {
      renderTime: 0,
      componentCounts: 0,
      lastUpdated: Date.now()
    }

    this.metrics.set(name, {
      ...existing,
      ...metrics,
      renderTime: (existing.renderTime + (metrics.renderTime || 0)) / 2 // 平均值
    })
  }

  /**
   * 获取性能报告
   */
  static getPerformanceReport() {
    return Object.fromEntries(this.metrics)
  }

  /**
   * 初始化Web Vitals监控
   */
  static initWebVitals() {
    // 监控LCP (Largest Contentful Paint)
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        console.log('LCP:', entry.startTime)
      })
    })

    observer.observe({ entryTypes: ['largest-contentful-paint'] })
    this.observers.push(observer)
  }

  /**
   * 清理监控器
   */
  static cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics.clear()
  }
}

// ============================================================================
// 6. 自动缓存清理
// ============================================================================

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    useAppCache.getState().cleanup()
  }, 10 * 60 * 1000) // 每10分钟清理一次

  // 页面可见性改变时清理缓存
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      useAppCache.getState().cleanup()
    }
  })
}

// 导出优化工具
export {
  ComponentLazyLoader,
  DynamicImporter,
  PerformanceMonitor
}