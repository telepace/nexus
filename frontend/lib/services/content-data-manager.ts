"use client";

/**
 * 智能内容数据管理器
 * 解决重复API调用、数据竞争和性能问题
 */

import { contentApi, ContentItemPublic, AIResult, ConversationListResponse } from "@/lib/api/content";
import { performanceMonitor } from "@/lib/utils/performance-monitor";

interface ContentData {
  item: ContentItemPublic;
  analysisResult?: AIResult | null;
  conversations?: ConversationListResponse["conversations"];
  lastFetched: number;
}

interface FetchOptions {
  includeAnalysis?: boolean;
  includeConversations?: boolean;
  forceRefresh?: boolean;
  mode?: 'preview' | 'full';
}

interface DataRequest {
  contentId: string;
  options: FetchOptions;
  resolve: (data: ContentData | null) => void;
  reject: (error: Error) => void;
}

class ContentDataManager {
  private cache = new Map<string, ContentData>();
  private pendingRequests = new Map<string, DataRequest[]>();
  private activeRequests = new Set<string>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟
  private readonly PREVIEW_CACHE_TTL = 2 * 60 * 1000; // preview模式2分钟

  /**
   * 获取内容数据 - 智能合并请求，避免重复调用
   */
  async getContentData(contentId: string, options: FetchOptions = {}): Promise<ContentData | null> {
    return performanceMonitor.measureAsync(
      `getContentData:${contentId}:${options.mode || 'default'}`,
      async () => {
        const cacheKey = this.getCacheKey(contentId, options);
        
        // 检查缓存
        const cached = this.getCachedData(contentId, options);
        if (cached && !options.forceRefresh) {
          performanceMonitor.measure('cache-hit', () => {});
          return cached;
        }

        // 如果已有相同请求在进行中，等待结果
        if (this.activeRequests.has(cacheKey)) {
          return this.queueRequest(contentId, options);
        }

        // 执行新请求
        return this.executeRequest(contentId, options);
      },
      { contentId, mode: options.mode, includeConversations: options.includeConversations }
    );
  }

  /**
   * Preview模式专用 - 获取基本数据和必要的引用信息
   */
  async getPreviewData(contentId: string): Promise<ContentData | null> {
    return this.getContentData(contentId, {
      includeAnalysis: true,
      includeConversations: true, // 🎯 修复：Preview模式也需要对话历史以支持引用功能
      mode: 'preview'
    });
  }

  /**
   * 轻量Preview模式 - 只获取基本数据，完全不加载对话历史
   * 用于快速预览场景，不需要引用功能
   */
  async getLightPreviewData(contentId: string): Promise<ContentData | null> {
    return this.getContentData(contentId, {
      includeAnalysis: true,
      includeConversations: false, // 轻量模式不加载对话历史
      mode: 'preview'
    });
  }

  /**
   * 完整模式 - 获取所有数据
   */
  async getFullData(contentId: string, forceRefresh = false): Promise<ContentData | null> {
    return this.getContentData(contentId, {
      includeAnalysis: true,
      includeConversations: true,
      forceRefresh,
      mode: 'full'
    });
  }

  /**
   * 批量预加载 - 只预加载基本数据
   */
  async batchPrefetch(contentIds: string[]): Promise<void> {
    const batchSize = 5; // 限制并发数
    
    for (let i = 0; i < contentIds.length; i += batchSize) {
      const batch = contentIds.slice(i, i + batchSize);
      const promises = batch.map(id => 
        this.getPreviewData(id).catch(error => {
          console.debug(`Prefetch failed for ${id}:`, error);
          return null;
        })
      );
      
      await Promise.allSettled(promises);
      
      // 批次间添加短暂延迟，避免压垮服务器
      if (i + batchSize < contentIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * 清除特定内容的缓存
   */
  invalidateContent(contentId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(`${contentId}:`)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, data] of this.cache.entries()) {
      const ttl = key.includes(':preview:') ? this.PREVIEW_CACHE_TTL : this.CACHE_TTL;
      if (now - data.lastFetched > ttl) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheKey(contentId: string, options: FetchOptions): string {
    const parts = [contentId];
    
    if (options.mode) parts.push(options.mode);
    if (options.includeAnalysis) parts.push('analysis');
    if (options.includeConversations) parts.push('conversations');
    
    return parts.join(':');
  }

  private getCachedData(contentId: string, options: FetchOptions): ContentData | null {
    const cacheKey = this.getCacheKey(contentId, options);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    const ttl = options.mode === 'preview' ? this.PREVIEW_CACHE_TTL : this.CACHE_TTL;
    if (Date.now() - cached.lastFetched > ttl) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }

  private async queueRequest(contentId: string, options: FetchOptions): Promise<ContentData | null> {
    const cacheKey = this.getCacheKey(contentId, options);
    
    return new Promise((resolve, reject) => {
      if (!this.pendingRequests.has(cacheKey)) {
        this.pendingRequests.set(cacheKey, []);
      }
      
      this.pendingRequests.get(cacheKey)!.push({
        contentId,
        options,
        resolve,
        reject
      });
    });
  }

  private async executeRequest(contentId: string, options: FetchOptions): Promise<ContentData | null> {
    const cacheKey = this.getCacheKey(contentId, options);
    this.activeRequests.add(cacheKey);

    try {
      const data = await this.fetchData(contentId, options);
      
      // 缓存结果
      if (data) {
        this.cache.set(cacheKey, data);
      }
      
      // 解决排队的请求
      this.resolvePendingRequests(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error(`Failed to fetch content data for ${contentId}:`, error);
      
      // 拒绝排队的请求
      this.rejectPendingRequests(cacheKey, error as Error);
      
      return null;
    } finally {
      this.activeRequests.delete(cacheKey);
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchData(contentId: string, options: FetchOptions): Promise<ContentData | null> {
    const promises: Promise<any>[] = [];
    
    // 总是获取基本内容项
    promises.push(contentApi.getContentItem(contentId));
    
    // 根据选项决定是否获取对话历史
    if (options.includeConversations) {
      promises.push(contentApi.getContentConversations(contentId, false));
    }

    const results = await Promise.allSettled(promises);
    
    // 处理内容项结果
    const itemResult = results[0];
    if (itemResult.status !== 'fulfilled') {
      throw new Error('Failed to fetch content item');
    }
    
    const item = itemResult.value as ContentItemPublic;
    const analysisResult = options.includeAnalysis 
      ? (item as any).ai_result || null 
      : null;

    let conversations: ConversationListResponse["conversations"] = [];
    
    // 处理对话历史结果（如果请求了）
    if (options.includeConversations && results.length > 1) {
      const conversationsResult = results[1];
      if (conversationsResult.status === 'fulfilled') {
        conversations = (conversationsResult.value as ConversationListResponse).conversations || [];
      } else {
        console.warn('Failed to fetch conversations:', conversationsResult.reason);
      }
    }

    return {
      item,
      analysisResult,
      conversations,
      lastFetched: Date.now()
    };
  }

  private resolvePendingRequests(cacheKey: string, data: ContentData | null): void {
    const pendingRequests = this.pendingRequests.get(cacheKey) || [];
    pendingRequests.forEach(request => request.resolve(data));
  }

  private rejectPendingRequests(cacheKey: string, error: Error): void {
    const pendingRequests = this.pendingRequests.get(cacheKey) || [];
    pendingRequests.forEach(request => request.reject(error));
  }
}

// 导出单例实例
export const contentDataManager = new ContentDataManager();

// 定期清理缓存
if (typeof window !== "undefined") {
  setInterval(() => {
    contentDataManager.cleanup();
  }, 60000); // 每分钟清理一次
}

// 导出类型
export type { ContentData, FetchOptions };