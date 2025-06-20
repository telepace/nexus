interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface ContentDetail {
  id: string;
  type: string;
  title?: string | null;
  summary?: string | null;
  content_text?: string | null;
  processed_content?: string | null;
  source_uri?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

interface ContentItemPublic {
  id: string;
  type: string;
  source_uri?: string | null;
  title?: string | null;
  summary?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

class ContentCacheService {
  private cache = new Map<string, CacheItem<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private isExpired<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      return null;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 内容列表缓存
  setContentList(items: ContentItemPublic[], ttl?: number): void {
    this.set("content-list", items, ttl);
  }

  getContentList(): ContentItemPublic[] | null {
    return this.get<ContentItemPublic[]>("content-list");
  }

  clearContentList(): void {
    this.delete("content-list");
  }

  // 内容详情缓存
  setContentDetail(id: string, detail: ContentDetail, ttl?: number): void {
    this.set(`content-detail-${id}`, detail, ttl);
  }

  getContentDetail(id: string): ContentDetail | null {
    return this.get<ContentDetail>(`content-detail-${id}`);
  }

  // Markdown内容缓存
  setMarkdownContent(id: string, markdown: string, ttl?: number): void {
    this.set(`markdown-${id}`, markdown, ttl);
  }

  getMarkdownContent(id: string): string | null {
    return this.get<string>(`markdown-${id}`);
  }

  // 预加载方法
  async prefetchContent(id: string): Promise<void> {
    // 检查是否已经缓存
    if (this.has(`content-detail-${id}`)) {
      return;
    }

    // 这里可以实现后台预加载逻辑
    // 由于需要token等认证信息，实际的预加载需要在组件中实现
    console.log(`Prefetching content ${id}...`);
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// 导出单例实例
export const contentCache = new ContentCacheService();

// 定期清理过期缓存
if (typeof window !== "undefined") {
  setInterval(() => {
    contentCache.cleanup();
  }, 60000); // 每分钟清理一次
}
