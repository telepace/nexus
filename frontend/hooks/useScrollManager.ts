"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 滚动策略枚举
 */
export type ScrollStrategy = 
  | "preserve"    // 保持当前滚动位置
  | "top"         // 滚动到顶部
  | "bottom"      // 滚动到底部
  | "smart"       // 智能滚动
  | "none";       // 不执行任何滚动

/**
 * 滚动场景配置
 */
export interface ScrollScenario {
  variant: "preview" | "sidebar" | "fullscreen";
  scene: "preview" | "reader" | "standalone";
  contentChanged: boolean;
  userHasScrolled: boolean;
  hasNewContent: boolean;
}

/**
 * 滚动管理器配置
 */
export interface ScrollManagerConfig {
  /** 滚动行为 */
  behavior?: ScrollBehavior;
  /** 是否启用用户意图检测 */
  enableUserIntentDetection?: boolean;
  /** 滚动防抖时间（毫秒） */
  debounceMs?: number;
  /** 是否在开发环境打印调试日志 */
  debug?: boolean;
}

/**
 * 统一的滚动管理Hook
 * 
 * 🎯 解决问题：
 * - 多处冲突的滚动逻辑
 * - 用户滚动意图被覆盖
 * - 不同场景下的滚动行为不一致
 */
export const useScrollManager = (config: ScrollManagerConfig = {}) => {
  const {
    behavior = "smooth",
    enableUserIntentDetection = true,
    debounceMs = 100,
    debug = process.env.NODE_ENV === "development",
  } = config;

  // 用户交互状态
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  // 内部状态
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTop = useRef(0);
  const userScrollDetectionRef = useRef<NodeJS.Timeout>();
  const lastScrollTime = useRef(0); // 🎯 新增：记录最后滚动时间

  // 调试日志
  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[ScrollManager] ${message}`, data);
      }
    },
    [debug]
  );

  /**
   * 重置用户滚动状态
   */
  const resetUserScrollIntent = useCallback(() => {
    log("重置用户滚动意图");
    setUserHasScrolled(false);
    setIsUserScrolling(false);
    lastScrollTop.current = 0;
  }, [log]);

  /**
   * 处理滚动事件
   */
  const handleScroll = useCallback(
    (event: Event) => {
      if (!enableUserIntentDetection) return;

      const target = event.target as HTMLElement;
      const currentScrollTop = target.scrollTop;

      // 检测是否是用户主动滚动
      if (Math.abs(currentScrollTop - lastScrollTop.current) > 5) {
        const now = Date.now();
        lastScrollTime.current = now; // 🎯 记录滚动时间
        
        setUserHasScrolled(true);
        setIsUserScrolling(true);

        // 清除之前的定时器
        if (userScrollDetectionRef.current) {
          clearTimeout(userScrollDetectionRef.current);
        }

        // 150ms后认为用户停止滚动
        userScrollDetectionRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 150);

        log("检测到用户滚动", { 
          scrollTop: currentScrollTop, 
          delta: currentScrollTop - lastScrollTop.current,
          timestamp: now
        });
      }

      lastScrollTop.current = currentScrollTop;
    },
    [enableUserIntentDetection, log]
  );

  /**
   * 获取滚动策略
   */
  const getScrollStrategy = useCallback(
    (scenario: ScrollScenario): ScrollStrategy => {
      const { variant, scene, contentChanged, userHasScrolled, hasNewContent } = scenario;

      log("计算滚动策略", scenario);

      // 用户正在滚动时不执行自动滚动
      if (isUserScrolling) {
        log("用户正在滚动，跳过自动滚动");
        return "none";
      }

      // Preview模式的策略
      if (variant === "preview" && scene === "preview") {
        // 🚨 关键修复：Preview模式更加保守，优先保持用户位置
        
        // 🎯 增强保护：检查最近3秒内的滚动活动
        const recentScrollActivity = Date.now() - lastScrollTime.current < 3000;
        
        // 用户已经滚动过或最近有滚动活动，绝对保持位置
        if (userHasScrolled || recentScrollActivity) {
          log("Preview模式：用户已滚动或最近有滚动活动，保持位置", {
            userHasScrolled,
            recentScrollActivity,
            timeSinceScroll: Date.now() - lastScrollTime.current
          });
          return "preserve";
        }
        
        // 有新内容（如AI回复），且用户未滚动过，可以滚动到新内容
        if (hasNewContent && !userHasScrolled) {
          log("Preview模式：有新内容，滚动到底部");
          return "bottom";
        }
        
        // 🎯 内容变化的情况：只在确实是新文章时才滚动到顶部
        if (contentChanged && !userHasScrolled) {
          // Preview模式下更保守：延迟滚动，给用户更多时间
          log("Preview模式：内容变化，谨慎滚动到顶部");
          return "top";
        }
        
        // 🎯 默认策略改为保持位置，避免意外滚动
        log("Preview模式：默认保持位置");
        return "preserve";
      }

      // 全屏模式或阅读器模式
      if (variant === "fullscreen" || scene === "reader") {
        // 内容变化时的智能滚动
        if (contentChanged) {
          return userHasScrolled ? "preserve" : "top";
        }
        // 有新内容时滚动到底部（如AI回复）
        if (hasNewContent) {
          return "bottom";
        }
      }

      // 侧边栏模式
      if (variant === "sidebar") {
        return userHasScrolled ? "preserve" : "smart";
      }

      return "none";
    },
    [isUserScrolling, log]
  );

  /**
   * 执行滚动
   */
  const executeScroll = useCallback(
    (
      containerRef: React.RefObject<HTMLElement>,
      strategy: ScrollStrategy,
      options?: { offset?: number; force?: boolean }
    ) => {
      const { offset = 0, force = false } = options || {};

      if (!containerRef.current) {
        log("容器不存在，跳过滚动");
        return;
      }

      // 🚨 最终安全保护：检查最近滚动活动
      const recentScrollActivity = Date.now() - lastScrollTime.current < 3000;
      
      // 强制模式或用户未滚动时才执行
      if (!force && (userHasScrolled || recentScrollActivity) && strategy !== "preserve") {
        log("用户已滚动或最近有滚动活动，跳过滚动", { 
          strategy, 
          userHasScrolled,
          recentScrollActivity,
          timeSinceScroll: Date.now() - lastScrollTime.current
        });
        return;
      }

      const container = containerRef.current;

      // 清除之前的滚动定时器
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // 防抖执行滚动
      scrollTimeoutRef.current = setTimeout(() => {
        try {
          switch (strategy) {
            case "top":
              log("执行滚动到顶部");
              container.scrollTo({ 
                top: offset, 
                behavior: behavior 
              });
              break;

            case "bottom":
              log("执行滚动到底部");
              container.scrollTo({ 
                top: container.scrollHeight - container.clientHeight + offset,
                behavior: behavior 
              });
              break;

            case "smart":
              // 智能滚动：根据内容位置决定
              const currentScroll = container.scrollTop;
              const maxScroll = container.scrollHeight - container.clientHeight;
              
              if (currentScroll < maxScroll * 0.1) {
                // 接近顶部，滚动到顶部
                log("智能滚动：滚动到顶部");
                container.scrollTo({ top: 0, behavior: behavior });
              } else if (currentScroll > maxScroll * 0.9) {
                // 接近底部，滚动到底部
                log("智能滚动：滚动到底部");
                container.scrollTo({ 
                  top: maxScroll, 
                  behavior: behavior 
                });
              }
              // 中间位置保持不变
              break;

            case "preserve":
              log("保持当前滚动位置");
              // 不执行任何滚动
              break;

            case "none":
              log("跳过滚动");
              break;

            default:
              log("未知滚动策略", { strategy });
          }
        } catch (error) {
          console.error("[ScrollManager] 滚动执行失败:", error);
        }
      }, debounceMs);
    },
    [userHasScrolled, behavior, debounceMs, log]
  );

  /**
   * 智能滚动：根据场景自动选择策略
   */
  const smartScroll = useCallback(
    (
      containerRef: React.RefObject<HTMLElement>,
      scenario: ScrollScenario,
      options?: { offset?: number; force?: boolean }
    ) => {
      const strategy = getScrollStrategy(scenario);
      log("智能滚动", { strategy, scenario });
      executeScroll(containerRef, strategy, options);
    },
    [getScrollStrategy, executeScroll, log]
  );

  /**
   * 滚动到指定位置
   */
  const scrollTo = useCallback(
    (
      containerRef: React.RefObject<HTMLElement>,
      position: { top?: number; behavior?: ScrollBehavior }
    ) => {
      if (!containerRef.current) return;

      const { top = 0, behavior: scrollBehavior = behavior } = position;
      
      log("滚动到指定位置", { top, behavior: scrollBehavior });
      
      containerRef.current.scrollTo({
        top,
        behavior: scrollBehavior,
      });
    },
    [behavior, log]
  );

  /**
   * 滚动元素到视图中
   */
  const scrollIntoView = useCallback(
    (
      element: HTMLElement,
      options?: ScrollIntoViewOptions
    ) => {
      if (!element) return;

      log("滚动元素到视图", { element: element.tagName });
      
      element.scrollIntoView({
        behavior: behavior,
        block: "nearest",
        inline: "nearest",
        ...options,
      });
    },
    [behavior, log]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (userScrollDetectionRef.current) {
        clearTimeout(userScrollDetectionRef.current);
      }
    };
  }, []);

  return {
    // 状态
    userHasScrolled,
    isUserScrolling,

    // 方法
    handleScroll,
    resetUserScrollIntent,
    getScrollStrategy,
    executeScroll,
    smartScroll,
    scrollTo,
    scrollIntoView,

    // 工具方法
    log,
  };
};

/**
 * 简化版滚动管理Hook - 用于简单场景
 */
export const useSimpleScrollManager = (
  containerRef: React.RefObject<HTMLElement>,
  config: ScrollManagerConfig = {}
) => {
  const scrollManager = useScrollManager(config);

  const scrollToTop = useCallback(
    (options?: { force?: boolean }) => {
      scrollManager.executeScroll(containerRef, "top", options);
    },
    [scrollManager, containerRef]
  );

  const scrollToBottom = useCallback(
    (options?: { force?: boolean }) => {
      scrollManager.executeScroll(containerRef, "bottom", options);
    },
    [scrollManager, containerRef]
  );

  const preserveScroll = useCallback(() => {
    scrollManager.executeScroll(containerRef, "preserve");
  }, [scrollManager, containerRef]);

  return {
    ...scrollManager,
    scrollToTop,
    scrollToBottom,
    preserveScroll,
  };
};