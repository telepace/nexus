"use client";

/**
 * 内存管理工具
 * 用于清理事件监听器、定时器和防止内存泄漏
 */

// 清理函数类型
type CleanupFunction = () => void;

// 内存管理器类
class MemoryManager {
  private cleanupCallbacks = new Set<CleanupFunction>();
  private timers = new Set<NodeJS.Timeout>();
  private intervals = new Set<NodeJS.Timeout>();
  private listeners = new Map<string, { element: EventTarget; type: string; listener: EventListener }>();

  /**
   * 注册清理回调
   */
  registerCleanup(cleanup: CleanupFunction): void {
    this.cleanupCallbacks.add(cleanup);
  }

  /**
   * 移除清理回调
   */
  unregisterCleanup(cleanup: CleanupFunction): void {
    this.cleanupCallbacks.delete(cleanup);
  }

  /**
   * 创建受管理的定时器
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    
    this.timers.add(timer);
    return timer;
  }

  /**
   * 创建受管理的间隔定时器
   */
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * 清除特定定时器
   */
  clearTimeout(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  /**
   * 清除特定间隔定时器
   */
  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * 添加受管理的事件监听器
   */
  addEventListener(
    element: EventTarget, 
    type: string, 
    listener: EventListener, 
    options?: boolean | AddEventListenerOptions
  ): string {
    const id = `${Date.now()}_${Math.random()}`;
    
    element.addEventListener(type, listener, options);
    this.listeners.set(id, { element, type, listener });
    
    return id;
  }

  /**
   * 移除特定事件监听器
   */
  removeEventListener(id: string): void {
    const listenerInfo = this.listeners.get(id);
    if (listenerInfo) {
      listenerInfo.element.removeEventListener(listenerInfo.type, listenerInfo.listener);
      this.listeners.delete(id);
    }
  }

  /**
   * 清理所有资源
   */
  cleanup(): void {
    // 清除所有定时器
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // 清除所有间隔定时器
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // 移除所有事件监听器
    this.listeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this.listeners.clear();

    // 执行所有注册的清理回调
    this.cleanupCallbacks.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    });
    this.cleanupCallbacks.clear();
  }

  /**
   * 获取当前资源使用情况
   */
  getStats(): {
    timers: number;
    intervals: number;
    listeners: number;
    cleanupCallbacks: number;
  } {
    return {
      timers: this.timers.size,
      intervals: this.intervals.size,
      listeners: this.listeners.size,
      cleanupCallbacks: this.cleanupCallbacks.size,
    };
  }
}

// React Hook: 使用内存管理器
export function useMemoryManager(): MemoryManager {
  const managerRef = React.useRef<MemoryManager | null>(null);
  
  if (!managerRef.current) {
    managerRef.current = new MemoryManager();
  }

  React.useEffect(() => {
    const manager = managerRef.current!;
    
    return () => {
      manager.cleanup();
    };
  }, []);

  return managerRef.current;
}

// 防抖Hook - 使用内存管理器
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const memoryManager = useMemoryManager();
  const callbackRef = React.useRef<T>(callback);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // 更新回调引用
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        memoryManager.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = memoryManager.setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay, memoryManager]
  );
}

// 节流Hook - 使用内存管理器
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const memoryManager = useMemoryManager();
  const callbackRef = React.useRef<T>(callback);
  const lastCallRef = React.useRef<number>(0);

  // 更新回调引用
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return React.useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      }
    }) as T,
    [delay, memoryManager]
  );
}

// 智能状态更新Hook - 减少不必要的重渲染
export function useSmartState<T>(
  initialState: T,
  isEqual?: (a: T, b: T) => boolean
): [T, (newState: T | ((prevState: T) => T)) => void] {
  const [state, setState] = React.useState<T>(initialState);
  const stateRef = React.useRef<T>(state);
  
  // 默认比较函数
  const defaultIsEqual = React.useCallback((a: T, b: T) => {
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return a === b;
  }, []);

  const equalityCheck = isEqual || defaultIsEqual;

  const smartSetState = React.useCallback((newState: T | ((prevState: T) => T)) => {
    const nextState = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(stateRef.current)
      : newState;

    if (!equalityCheck(stateRef.current, nextState)) {
      stateRef.current = nextState;
      setState(nextState);
    }
  }, [equalityCheck]);

  // 更新ref
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  return [state, smartSetState];
}

// React组件清理Hook
export function useComponentCleanup(cleanup: CleanupFunction): void {
  const memoryManager = useMemoryManager();
  
  React.useEffect(() => {
    memoryManager.registerCleanup(cleanup);
    
    return () => {
      memoryManager.unregisterCleanup(cleanup);
    };
  }, [cleanup, memoryManager]);
}

// 导入React
import React from 'react';

export { MemoryManager };