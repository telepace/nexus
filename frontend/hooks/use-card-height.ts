import { useEffect, useRef, useState, useCallback, useReducer } from "react";

/**
 * 动态卡片高度管理 Hook - 重构版
 * 使用 reducer + ref 模式避免状态更新冲突
 */

interface HeightState {
  heights: Record<string, number>;
}

type HeightAction =
  | { type: "UPDATE_HEIGHT"; cardId: string; height: number }
  | { type: "REMOVE_HEIGHT"; cardId: string }
  | { type: "CLEAR_ALL" };

function heightReducer(state: HeightState, action: HeightAction): HeightState {
  switch (action.type) {
    case "UPDATE_HEIGHT": {
      const { cardId, height } = action;
      const currentHeight = state.heights[cardId];
      // 减少微小变化的更新
      if (Math.abs((currentHeight || 0) - height) <= 10) {
        return state;
      }
      return {
        heights: { ...state.heights, [cardId]: height },
      };
    }
    case "REMOVE_HEIGHT": {
      const { cardId } = action;
      if (!(cardId in state.heights)) {
        return state;
      }
      const { [cardId]: removed, ...rest } = state.heights;
      return { heights: rest };
    }
    case "CLEAR_ALL":
      return { heights: {} };
    default:
      return state;
  }
}

export function useCardHeight() {
  const [state, dispatch] = useReducer(heightReducer, { heights: {} });
  const observers = useRef<Record<string, ResizeObserver>>({});
  const elements = useRef<Record<string, HTMLElement>>({});
  const isMountedRef = useRef(true);
  const pendingUpdates = useRef<Set<string>>(new Set()); // 防止重复更新

  // 🎯 完全重写：安全的元素注册函数，避免状态更新冲突
  const registerElement = useCallback(
    (cardId: string, element: HTMLElement | null) => {
      // 🚨 严格检查：组件卸载时不执行任何操作
      if (!isMountedRef.current) {
        return;
      }

      if (!element) {
        // 清理旧的观察器（仅清理，不更新状态）
        if (observers.current[cardId]) {
          observers.current[cardId].disconnect();
          delete observers.current[cardId];
        }
        delete elements.current[cardId];

        // 🎯 只有在组件仍然挂载时才尝试更新状态
        if (isMountedRef.current && !pendingUpdates.current.has(cardId)) {
          pendingUpdates.current.add(cardId);
          // 使用 requestAnimationFrame 确保在安全的时机更新
          requestAnimationFrame(() => {
            if (isMountedRef.current) {
              dispatch({ type: "REMOVE_HEIGHT", cardId });
            }
            pendingUpdates.current.delete(cardId);
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

      // 防抖机制
      let updateTimeout: NodeJS.Timeout | null = null;
      let lastUpdateTime = 0;
      const MIN_UPDATE_INTERVAL = 150;

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
              // 🎯 使用 reducer 避免状态更新冲突
              if (!pendingUpdates.current.has(cardId)) {
                pendingUpdates.current.add(cardId);
                requestAnimationFrame(() => {
                  if (isMountedRef.current) {
                    dispatch({
                      type: "UPDATE_HEIGHT",
                      cardId,
                      height: newHeight,
                    });
                  }
                  pendingUpdates.current.delete(cardId);
                });
              }
            }
          }, delay);
        }
      });

      // 开始观察
      observers.current[cardId].observe(element);
      elements.current[cardId] = element;

      // 获取初始高度
      setTimeout(() => {
        if (isMountedRef.current && elements.current[cardId] === element) {
          const rect = element.getBoundingClientRect();
          const newHeight = Math.max(rect.height, 50);
          // 🎯 使用 reducer 和安全的更新机制
          if (!pendingUpdates.current.has(cardId)) {
            pendingUpdates.current.add(cardId);
            requestAnimationFrame(() => {
              if (isMountedRef.current) {
                dispatch({ type: "UPDATE_HEIGHT", cardId, height: newHeight });
              }
              pendingUpdates.current.delete(cardId);
            });
          }
        }
      }, 100);
    },
    [], // 完全无依赖，稳定引用
  );

  // 获取指定卡片的高度
  const getCardHeight = useCallback(
    (cardId: string, isCollapsed: boolean) => {
      if (isCollapsed) {
        return 0;
      }
      const height = state.heights[cardId];
      // 如果还没有测量到高度，返回一个合理的默认值，避免视觉跳跃
      return height !== undefined ? height : 400; // 使用更合理的默认高度
    },
    [state.heights],
  );

  // 清理所有观察器
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false; // 🎯 优先标记组件已卸载

      // 清理所有定时器和观察器
      Object.values(observers.current).forEach((observer) => {
        observer.disconnect();
      });
      observers.current = {};
      elements.current = {};
      pendingUpdates.current.clear();

      // 🎯 最后清理状态（在组件卸载标记之后）
      requestAnimationFrame(() => {
        dispatch({ type: "CLEAR_ALL" });
      });
    };
  }, []);

  return {
    registerElement,
    getCardHeight,
    heights: state.heights, // 保持向后兼容
  };
}
