import { useEffect, useRef, useState, useCallback } from "react";

/**
 * 动态卡片高度管理 Hook
 * 使用 ResizeObserver 监听内容实际高度，替代固定的 max-height 限制
 */
export function useCardHeight() {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const observers = useRef<Record<string, ResizeObserver>>({});
  const elements = useRef<Record<string, HTMLElement>>({});

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

      // 创建新的 ResizeObserver
      observers.current[cardId] = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const height = entry.contentRect.height;
          // 使用 requestAnimationFrame 防止无限循环
          requestAnimationFrame(() => {
            setHeights((prev) => {
              const currentHeight = prev[cardId];
              const newHeight = Math.max(height, 50);
              // 只有高度真正变化时才更新状态
              if (currentHeight !== newHeight) {
                return {
                  ...prev,
                  [cardId]: newHeight,
                };
              }
              return prev;
            });
          });
        }
      });

      // 开始观察
      observers.current[cardId].observe(element);
      elements.current[cardId] = element;

      // 立即获取初始高度（延迟执行避免同步更新）
      requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const newHeight = Math.max(rect.height, 50);
        setHeights((prev) => {
          const currentHeight = prev[cardId];
          if (currentHeight !== newHeight) {
            return {
              ...prev,
              [cardId]: newHeight,
            };
          }
          return prev;
        });
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
    return () => {
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
