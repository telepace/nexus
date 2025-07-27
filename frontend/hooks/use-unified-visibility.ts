"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

export interface VisibilityItem {
  id: string;
  visible: boolean;
  priority: number; // 优先级，数字越大优先级越高
  lastUpdated: number;
}

export interface VisibilityConfig {
  defaultVisible?: boolean;
  maxVisible?: number; // 最大同时可见数量
  fadeDuration?: number; // 淡入淡出持续时间
  autoHideDelay?: number; // 自动隐藏延迟（毫秒）
}

/**
 * 统一的可见性管理hook
 * 解决重复的显示/隐藏状态管理问题
 */
export function useUnifiedVisibility(config: VisibilityConfig = {}) {
  const {
    defaultVisible = false,
    maxVisible = Infinity,
    fadeDuration = 200,
    autoHideDelay = 0
  } = config;

  const [items, setItems] = useState<Map<string, VisibilityItem>>(new Map());
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 清理定时器
  const clearItemTimeout = useCallback((id: string) => {
    const timer = timeoutRefs.current.get(id);
    if (timer) {
      global.clearTimeout(timer);
      timeoutRefs.current.delete(id);
    }
  }, []);

  // 设置可见性
  const setVisible = useCallback((id: string, visible: boolean, priority: number = 0) => {
    setItems(prev => {
      const newMap = new Map(prev);
      const now = Date.now();

      if (visible) {
        // 如果设置为可见，先清理自动隐藏定时器
        clearItemTimeout(id);
        
        // 检查是否超过最大可见数量
        const visibleItems = Array.from(newMap.values()).filter(item => item.visible);
        if (visibleItems.length >= maxVisible && maxVisible !== Infinity) {
          // 找到优先级最低的项目并隐藏
          const lowestPriority = Math.min(...visibleItems.map(item => item.priority));
          const itemToHide = visibleItems.find(item => item.priority === lowestPriority);
          if (itemToHide && itemToHide.priority < priority) {
            newMap.set(itemToHide.id, { ...itemToHide, visible: false, lastUpdated: now });
          }
        }

        newMap.set(id, { id, visible: true, priority, lastUpdated: now });

        // 设置自动隐藏
        if (autoHideDelay > 0) {
          const timer = setTimeout(() => {
            setVisible(id, false, priority);
          }, autoHideDelay);
          timeoutRefs.current.set(id, timer);
        }
      } else {
        // 设置为不可见
        clearItemTimeout(id);
        newMap.set(id, { id, visible: false, priority, lastUpdated: now });
      }

      return newMap;
    });
  }, [maxVisible, autoHideDelay, clearItemTimeout]);

  // 切换可见性
  const toggleVisible = useCallback((id: string, priority: number = 0) => {
    const item = items.get(id);
    setVisible(id, !item?.visible, priority);
  }, [items, setVisible]);

  // 隐藏所有
  const hideAll = useCallback(() => {
    setItems(prev => {
      const newMap = new Map();
      const now = Date.now();
      
      prev.forEach((item, id) => {
        clearItemTimeout(id);
        newMap.set(id, { ...item, visible: false, lastUpdated: now });
      });
      
      return newMap;
    });
  }, [clearItemTimeout]);

  // 批量设置可见性
  const setBatchVisible = useCallback((updates: Array<{id: string, visible: boolean, priority?: number}>) => {
    setItems(prev => {
      const newMap = new Map(prev);
      const now = Date.now();

      updates.forEach(({ id, visible, priority = 0 }) => {
        if (visible) {
          clearItemTimeout(id);
        }
        newMap.set(id, { id, visible, priority, lastUpdated: now });
      });

      return newMap;
    });
  }, [clearItemTimeout]);

  // 获取可见项目
  const getVisibleItems = useCallback(() => {
    return Array.from(items.values())
      .filter(item => item.visible)
      .sort((a, b) => b.priority - a.priority);
  }, [items]);

  // 检查特定项目是否可见
  const isVisible = useCallback((id: string) => {
    return items.get(id)?.visible ?? defaultVisible;
  }, [items, defaultVisible]);

  // 获取项目信息
  const getItem = useCallback((id: string) => {
    return items.get(id);
  }, [items]);

  // 清理钩子
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timer => global.clearTimeout(timer));
      timeoutRefs.current.clear();
    };
  }, []);

  // 生成优化的样式类
  const getVisibilityClasses = useCallback((id: string, baseClasses: string = '') => {
    const visible = isVisible(id);
    return `${baseClasses} transition-opacity duration-${fadeDuration} ${
      visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`.trim();
  }, [isVisible, fadeDuration]);

  // 生成内联样式（用于更精细的控制）
  const getVisibilityStyles = useCallback((id: string, additionalStyles: React.CSSProperties = {}) => {
    const visible = isVisible(id);
    return {
      ...additionalStyles,
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
      transition: `opacity ${fadeDuration}ms ease-out`,
    } as React.CSSProperties;
  }, [isVisible, fadeDuration]);

  return {
    // 状态
    items: Array.from(items.values()),
    visibleItems: getVisibleItems(),
    
    // 方法
    setVisible,
    toggleVisible,
    hideAll,
    setBatchVisible,
    isVisible,
    getItem,
    
    // 样式辅助
    getVisibilityClasses,
    getVisibilityStyles,
    
    // 配置
    config: { defaultVisible, maxVisible, fadeDuration, autoHideDelay }
  };
}

/**
 * 预设配置
 */
export const visibilityPresets = {
  // 工具提示配置
  tooltip: {
    defaultVisible: false,
    maxVisible: 1,
    fadeDuration: 150,
    autoHideDelay: 0
  },
  
  // 预览面板配置
  preview: {
    defaultVisible: true,
    maxVisible: 2,
    fadeDuration: 200,
    autoHideDelay: 0
  },
  
  // 悬浮面板配置
  hover: {
    defaultVisible: false,
    maxVisible: 3,
    fadeDuration: 100,
    autoHideDelay: 2000
  },
  
  // 模态框配置
  modal: {
    defaultVisible: false,
    maxVisible: 1,
    fadeDuration: 300,
    autoHideDelay: 0
  }
} as const;