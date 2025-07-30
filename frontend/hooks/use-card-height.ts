import { useEffect, useRef, useState, useCallback } from "react";

/**
 * 动态卡片高度管理 Hook
 * 使用 ResizeObserver 监听内容实际高度，替代固定的 max-height 限制
 */
export function useCardHeight() {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const observers = useRef<Record<string, ResizeObserver>>({});
  const elements = useRef<Record<string, HTMLElement>>({});
  const isMountedRef = useRef(true); // 跟踪组件是否已挂载

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
        // 只有在组件仍然挂载时才更新状态
        if (isMountedRef.current) {
          // 使用微任务来延迟状态更新，避免在渲染过程中调用setState
          Promise.resolve().then(() => {
            if (isMountedRef.current) {
              setHeights((prev) => {
                const updated = { ...prev };
                delete updated[cardId];
                return updated;
              });
            }
          });
        }
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

      // 更强的防抖和节流机制
      let updateTimeout: NodeJS.Timeout | null = null;
      let lastUpdateTime = 0;
      const MIN_UPDATE_INTERVAL = 100; // 增加最小更新间隔到100ms

      // 创建新的 ResizeObserver
      observers.current[cardId] = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const height = entry.contentRect.height;
          const now = Date.now();
          
          // 清除之前的更新计划
          if (updateTimeout) {
            clearTimeout(updateTimeout);
          }
          
          // 更激进的防抖和节流，减少状态更新频率
          const timeSinceLastUpdate = now - lastUpdateTime;
          const delay = Math.max(MIN_UPDATE_INTERVAL - timeSinceLastUpdate, 50);
          
          updateTimeout = setTimeout(() => {
            if (isMountedRef.current) {
              setHeights((prev) => {
                const currentHeight = prev[cardId];
                const newHeight = Math.max(height, 50);
                // 提高变化阈值，减少微小变化的更新
                if (Math.abs((currentHeight || 0) - newHeight) > 10) {
                  lastUpdateTime = Date.now();
                  return {
                    ...prev,
                    [cardId]: newHeight,
                  };
                }
                return prev;
              });
            }
          }, delay);
        }
      });

      // 开始观察
      observers.current[cardId].observe(element);
      elements.current[cardId] = element;

      // 使用微任务获取初始高度，避免与ResizeObserver冲突
      Promise.resolve().then(() => {
        if (isMountedRef.current && elements.current[cardId] === element) {
          const rect = element.getBoundingClientRect();
          const newHeight = Math.max(rect.height, 50);
          setHeights((prev) => {
            const currentHeight = prev[cardId];
            // 使用更高的初始阈值
            if (Math.abs((currentHeight || 0) - newHeight) > 15) {
              return {
                ...prev,
                [cardId]: newHeight,
              };
            }
            return prev;
          });
        }
      });
    },
    [],
  );

  // 获取指定卡片的高度
  const getCardHeight = useCallback(
    (cardId: string, isCollapsed: boolean) => {
      if (isCollapsed) {
        return 0;
      }
      const height = heights[cardId];
      // 如果还没有测量到高度，返回一个较大的默认值以确保内容可见
      return height !== undefined ? height : 2000; // 增加默认高度以适应更长的内容
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
    };
  }, []);

  return {
    registerElement,
    getCardHeight,
    heights,
  };
}
