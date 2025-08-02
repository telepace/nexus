import { useEffect, useRef, useState, useCallback } from "react";

/**
 * 动态卡片高度管理 Hook
 * 使用 ResizeObserver 监听内容实际高度，替代固定的 max-height 限制
 */
export function useCardHeight() {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const observers = useRef<Record<string, ResizeObserver>>({});
  const elements = useRef<Record<string, HTMLElement>>({});
  const isMountedRef = useRef(true);
  const pendingUpdates = useRef<Set<string>>(new Set()); // 防止重复更新

  // 稳定的状态更新函数
  const updateHeight = useCallback((cardId: string, newHeight: number) => {
    if (!isMountedRef.current || pendingUpdates.current.has(cardId)) {
      return;
    }
    
    pendingUpdates.current.add(cardId);
    
    setHeights((prev) => {
      const currentHeight = prev[cardId];
      // 提高变化阈值，减少微小变化的更新
      if (Math.abs((currentHeight || 0) - newHeight) > 10) {
        pendingUpdates.current.delete(cardId);
        return {
          ...prev,
          [cardId]: newHeight,
        };
      }
      pendingUpdates.current.delete(cardId);
      return prev;
    });
  }, []);

  const removeHeight = useCallback((cardId: string) => {
    if (!isMountedRef.current || pendingUpdates.current.has(cardId)) {
      return;
    }
    
    pendingUpdates.current.add(cardId);
    
    setHeights((prev) => {
      if (cardId in prev) {
        const updated = { ...prev };
        delete updated[cardId];
        pendingUpdates.current.delete(cardId);
        return updated;
      }
      pendingUpdates.current.delete(cardId);
      return prev;
    });
  }, []);

  // 注册元素用于高度监听
  const registerElement = useCallback(
    (cardId: string, element: HTMLElement | null) => {
      if (!element) {
        // 清理旧的观察器
        if (observers.current[cardId]) {
          observers.current[cardId].disconnect();
          delete observers.current[cardId];
        }
        delete elements.current[cardId];
        
        // 延迟清理状态，避免同步状态更新
        setTimeout(() => {
          removeHeight(cardId);
        }, 0);
        return;
      }

      // 如果已经在监听同一个元素，跳过
      if (elements.current[cardId] === element) {
        return;
      }

      // 清理旧的观察器
      if (observers.current[cardId]) {
        observers.current[cardId].disconnect();
      }

      // 防抖机制
      let updateTimeout: NodeJS.Timeout | null = null;
      let lastUpdateTime = 0;
      const MIN_UPDATE_INTERVAL = 150; // 增加间隔以确保稳定性

      // 创建新的 ResizeObserver
      observers.current[cardId] = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry && isMountedRef.current) {
          const height = entry.contentRect.height;
          const now = Date.now();
          
          // 清除之前的更新计划
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          // 防抖处理
          const timeSinceLastUpdate = now - lastUpdateTime;
          const delay = Math.max(MIN_UPDATE_INTERVAL - timeSinceLastUpdate, 50);
          
          updateTimeout = setTimeout(() => {
            if (isMountedRef.current && elements.current[cardId] === element) {
              const newHeight = Math.max(height, 50);
              lastUpdateTime = Date.now();
              updateHeight(cardId, newHeight);
            }
          }, delay);
        }
      });

      // 开始观察
      observers.current[cardId].observe(element);
      elements.current[cardId] = element;

      // 获取初始高度 - 使用更长的延迟避免冲突
      setTimeout(() => {
        if (isMountedRef.current && elements.current[cardId] === element) {
          const rect = element.getBoundingClientRect();
          const newHeight = Math.max(rect.height, 50);
          updateHeight(cardId, newHeight);
        }
      }, 100);
    },
    [updateHeight, removeHeight],
  );

  // 获取指定卡片的高度
  const getCardHeight = useCallback(
    (cardId: string, isCollapsed: boolean) => {
      if (isCollapsed) {
        return 0;
      }
      const height = heights[cardId];
      // 如果还没有测量到高度，返回一个合理的默认值，避免视觉跳跃
      return height !== undefined ? height : 400; // 使用更合理的默认高度
    },
    [heights],
  );

  // 清理所有观察器
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false; // 标记组件已卸载
      Object.values(observers.current).forEach((observer) => {
        observer.disconnect();
      });
      observers.current = {};
      elements.current = {};
      pendingUpdates.current.clear(); // 清理待处理的更新
    };
  }, []);

  return {
    registerElement,
    getCardHeight,
    heights,
  };
}
