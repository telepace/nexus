import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

/**
 * 🎯 统一引用状态管理 Store
 *
 * 设计理念：
 * - 极简状态设计，避免过度复杂化
 * - 智能缓存和性能优化
 * - 统一的交互状态管理
 */

export interface ReferenceContent {
  id: string;
  refId: number;
  content: string;
  snippet: string;
  position?: {
    chapter?: string;
    index: number;
  };
  metadata?: {
    wordCount?: number;
    timestamp?: string;
  };
  loadedAt: number;
}

export interface PreviewData {
  refId: number;
  contentId: string;
  preview: string;
  position: { x: number; y: number };
  loadedAt: number;
}

export interface ReferenceConfig {
  // 交互延迟配置
  hoverDelay: number;
  hideDelay: number;
  clickDelay: number;

  // 动画配置
  animationDuration: number;
  enableAnimations: boolean;
  useGPUAcceleration: boolean;

  // 预览配置
  maxPreviewLength: number;
  previewPosition: "auto" | "top" | "bottom" | "left" | "right";

  // 缓存配置
  maxCacheSize: number;
  cacheTTL: number; // 毫秒

  // 响应式配置
  mobileHoverMode: "tap" | "long-press" | "disabled";
  keyboardNavigationEnabled: boolean;
}

export interface ReferenceState {
  // === 交互状态 ===
  hoveredRef: number | null;
  hoverTimeout: NodeJS.Timeout | null;
  activeModal: number | null;
  modalPosition: { x: number; y: number };

  // === 数据缓存 ===
  contentCache: Map<string, ReferenceContent>;
  previewCache: Map<string, PreviewData>;

  // === 性能状态 ===
  isLowPerformanceDevice: boolean;
  animationFrameId: number | null;

  // === 配置 ===
  config: ReferenceConfig;

  // === Actions ===
  // 悬浮状态管理
  setHoveredRef: (refId: number | null) => void;
  setHoverTimeout: (timeout: NodeJS.Timeout | null) => void;

  // 模态框管理
  openModal: (refId: number, position?: { x: number; y: number }) => void;
  closeModal: () => void;
  updateModalPosition: (position: { x: number; y: number }) => void;

  // 缓存管理
  setCachedContent: (key: string, content: ReferenceContent) => void;
  getCachedContent: (key: string) => ReferenceContent | null;
  setCachedPreview: (key: string, preview: PreviewData) => void;
  getCachedPreview: (key: string) => PreviewData | null;
  clearExpiredCache: () => void;
  clearAllCache: () => void;

  // 配置管理
  updateConfig: (partial: Partial<ReferenceConfig>) => void;
  resetConfig: () => void;

  // 性能优化
  setPerformanceMode: (isLowPerformance: boolean) => void;
  setAnimationFrame: (frameId: number | null) => void;

  // 工具方法
  getContentCacheKey: (refId: number, contentId: string) => string;
  getPreviewCacheKey: (refId: number, contentId: string) => string;
}

// 默认配置
const defaultConfig: ReferenceConfig = {
  hoverDelay: 150,
  hideDelay: 200,
  clickDelay: 0,

  animationDuration: 300,
  enableAnimations: true,
  useGPUAcceleration: true,

  maxPreviewLength: 200,
  previewPosition: "auto",

  maxCacheSize: 100,
  cacheTTL: 5 * 60 * 1000, // 5分钟

  mobileHoverMode: "tap",
  keyboardNavigationEnabled: true,
};

// 检测设备性能
const detectPerformance = (): boolean => {
  if (typeof window === "undefined") return false;

  // 基于硬件信息判断
  const navigator = window.navigator as any;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = navigator.deviceMemory || 4;

  // 低端设备判断标准
  return hardwareConcurrency <= 2 || deviceMemory <= 2;
};

export const useReferenceStore = create<ReferenceState>()(
  subscribeWithSelector((set, get) => ({
    // === 初始状态 ===
    hoveredRef: null,
    hoverTimeout: null,
    activeModal: null,
    modalPosition: { x: 0, y: 0 },

    contentCache: new Map(),
    previewCache: new Map(),

    isLowPerformanceDevice: detectPerformance(),
    animationFrameId: null,

    config: defaultConfig,

    // === Actions 实现 ===

    setHoveredRef: (refId) => {
      set({ hoveredRef: refId });
    },

    setHoverTimeout: (timeout) => {
      const current = get().hoverTimeout;
      if (current) {
        clearTimeout(current);
      }
      set({ hoverTimeout: timeout });
    },

    openModal: (
      refId,
      position = { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    ) => {
      set({
        activeModal: refId,
        modalPosition: position,
        hoveredRef: null, // 关闭悬浮预览
      });
    },

    closeModal: () => {
      set({ activeModal: null });
    },

    updateModalPosition: (position) => {
      set({ modalPosition: position });
    },

    setCachedContent: (key, content) => {
      const cache = get().contentCache;
      const maxSize = get().config.maxCacheSize;

      // LRU 缓存清理
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      cache.set(key, content);
      set({ contentCache: new Map(cache) });
    },

    getCachedContent: (key) => {
      const cache = get().contentCache;
      const content = cache.get(key);

      if (!content) return null;

      // 检查是否过期
      const now = Date.now();
      const ttl = get().config.cacheTTL;
      if (now - content.loadedAt > ttl) {
        cache.delete(key);
        set({ contentCache: new Map(cache) });
        return null;
      }

      return content;
    },

    setCachedPreview: (key, preview) => {
      const cache = get().previewCache;
      const maxSize = get().config.maxCacheSize;

      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      cache.set(key, preview);
      set({ previewCache: new Map(cache) });
    },

    getCachedPreview: (key) => {
      const cache = get().previewCache;
      const preview = cache.get(key);

      if (!preview) return null;

      const now = Date.now();
      const ttl = get().config.cacheTTL;
      if (now - preview.loadedAt > ttl) {
        cache.delete(key);
        set({ previewCache: new Map(cache) });
        return null;
      }

      return preview;
    },

    clearExpiredCache: () => {
      const now = Date.now();
      const ttl = get().config.cacheTTL;

      const contentCache = get().contentCache;
      const previewCache = get().previewCache;

      // 清理过期的内容缓存
      for (const [key, content] of contentCache.entries()) {
        if (now - content.loadedAt > ttl) {
          contentCache.delete(key);
        }
      }

      // 清理过期的预览缓存
      for (const [key, preview] of previewCache.entries()) {
        if (now - preview.loadedAt > ttl) {
          previewCache.delete(key);
        }
      }

      set({
        contentCache: new Map(contentCache),
        previewCache: new Map(previewCache),
      });
    },

    clearAllCache: () => {
      set({
        contentCache: new Map(),
        previewCache: new Map(),
      });
    },

    updateConfig: (partial) => {
      set((state) => ({
        config: { ...state.config, ...partial },
      }));
    },

    resetConfig: () => {
      set({ config: defaultConfig });
    },

    setPerformanceMode: (isLowPerformance) => {
      set({ isLowPerformanceDevice: isLowPerformance });

      // 自动调整配置
      if (isLowPerformance) {
        get().updateConfig({
          enableAnimations: false,
          useGPUAcceleration: false,
          animationDuration: 150,
          maxCacheSize: 50,
        });
      }
    },

    setAnimationFrame: (frameId) => {
      const current = get().animationFrameId;
      if (current) {
        cancelAnimationFrame(current);
      }
      set({ animationFrameId: frameId });
    },

    // 工具方法
    getContentCacheKey: (refId, contentId) => `content-${contentId}-${refId}`,
    getPreviewCacheKey: (refId, contentId) => `preview-${contentId}-${refId}`,
  })),
);

// 导出类型和钩子
export type { ReferenceState, ReferenceConfig, ReferenceContent, PreviewData };

// 便捷的状态选择器
export const useReferenceConfig = () =>
  useReferenceStore((state) => state.config);
export const useHoveredRef = () =>
  useReferenceStore((state) => state.hoveredRef);
export const useActiveModal = () =>
  useReferenceStore((state) => state.activeModal);
export const useReferenceCache = () =>
  useReferenceStore((state) => ({
    contentCache: state.contentCache,
    previewCache: state.previewCache,
    setCachedContent: state.setCachedContent,
    getCachedContent: state.getCachedContent,
    setCachedPreview: state.setCachedPreview,
    getCachedPreview: state.getCachedPreview,
  }));

// 定期清理缓存
if (typeof window !== "undefined") {
  setInterval(() => {
    useReferenceStore.getState().clearExpiredCache();
  }, 60000); // 每分钟清理一次
}
