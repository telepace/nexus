import { client } from "./client";

// 简单的内存缓存
class ReferenceCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear() {
    this.cache.clear();
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const referenceCache = new ReferenceCache();

// 定期清理缓存
if (typeof window !== "undefined") {
  setInterval(() => referenceCache.cleanup(), 60 * 1000); // 每分钟清理一次
}

export interface SourceParagraph {
  id: string;
  index: number;
  content: string;
  title?: string;
  startOffset?: number;
  endOffset?: number;
  chunkId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReferenceMapping {
  refId: number;
  paragraphId: string;
  relevanceScore?: number;
  snippet?: string;
}

export interface ContentReferenceInfo {
  contentId: string;
  paragraphs: SourceParagraph[];
  mappings: ReferenceMapping[];
  totalParagraphs: number;
}

// 重试机制
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000,
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // 最后一次重试失败，直接抛出错误
      if (i === maxRetries) {
        throw lastError;
      }

      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw lastError!;
}

// API错误类型
export interface ApiError extends Error {
  status?: number;
  code?: string;
}

// 创建标准化的API错误
function createApiError(
  message: string,
  status?: number,
  code?: string,
): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  return error;
}

export const referenceApi = {
  /**
   * 获取内容的段落信息（带缓存）
   */
  async getContentParagraphs(contentId: string): Promise<ContentReferenceInfo> {
    const cacheKey = `content-paragraphs-${contentId}`;

    // 验证 contentId
    if (!contentId || typeof contentId !== "string") {
      console.warn("Invalid contentId provided:", contentId);
      // 返回降级数据而不是抛出错误
      return {
        contentId: contentId || "unknown",
        paragraphs: [],
        mappings: [],
        totalParagraphs: 0,
      };
    }

    // 尝试从缓存获取
    const cached = referenceCache.get<ContentReferenceInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log(`正在获取内容段落信息: ${contentId}`);
      // 修改API路径从paragraphs改为segments
      const response = await client.get<{
        segments: Array<{
          id: string;
          display_number: number;
          content: string;
          start_offset?: number;
          end_offset?: number;
          created_at: string;
        }>;
        total: number;
        missing_numbers: number[];
      }>(`/api/v1/content/${contentId}/segments`);

      // 转换后端数据格式为前端期望的格式
      const convertedResponse: ContentReferenceInfo = {
        contentId: contentId,
        paragraphs: response.segments.map((segment) => ({
          id: segment.id,
          index: segment.display_number - 1, // 后端是1-based，前端期望0-based
          content: segment.content,
          startOffset: segment.start_offset,
          endOffset: segment.end_offset,
          metadata: {
            created_at: segment.created_at,
          },
        })),
        mappings: [],
        totalParagraphs: response.total,
      };

      // 缓存结果
      referenceCache.set(cacheKey, convertedResponse, 10 * 60 * 1000); // 10分钟缓存
      return convertedResponse;
    } catch (error) {
      console.error(`获取内容段落失败 (${contentId}):`, error);

      // HTTP 500 或其他服务器错误特殊处理 - 返回降级数据而不是抛出错误
      const errorStatus = (error as any)?.status;
      const errorMessage = (error as Error).message || "";
      console.log(
        `DEBUG: Error status: ${errorStatus}, Error message: "${errorMessage}"`,
      );

      // 更宽泛的服务器错误检测
      const isServerError =
        errorStatus >= 500 ||
        errorStatus === 500 ||
        errorMessage.includes("HTTP 500") ||
        errorMessage.includes("Internal Server Error") ||
        errorMessage.includes("500");

      if (isServerError) {
        console.warn(`服务器错误，使用降级数据 (${contentId})`);
        const fallbackData: ContentReferenceInfo = {
          contentId: contentId,
          paragraphs: [
            {
              id: "1",
              content: "原文内容暂时无法加载，请稍后重试",
              index: 0,
            },
          ],
          mappings: [],
          totalParagraphs: 1,
        };

        // 缓存降级数据，但缓存时间较短
        referenceCache.set(cacheKey, fallbackData, 2 * 60 * 1000); // 2分钟缓存
        return fallbackData;
      }

      // 其他错误也返回降级数据，避免应用崩溃
      console.warn(`未预期的错误，使用降级数据 (${contentId}):`, error);
      const safeFallbackData: ContentReferenceInfo = {
        contentId: contentId,
        paragraphs: [
          {
            id: "1",
            content: "内容加载失败，请稍后重试",
            index: 0,
          },
        ],
        mappings: [],
        totalParagraphs: 1,
      };

      // 缓存降级数据，但缓存时间很短
      referenceCache.set(cacheKey, safeFallbackData, 30 * 1000); // 30秒缓存
      return safeFallbackData;
    }
  },

  /**
   * 根据引用ID获取段落内容（带缓存和重试）
   */
  async getParagraphByRef(
    contentId: string,
    refId: number,
  ): Promise<SourceParagraph | null> {
    if (!contentId || !refId || refId < 1) {
      throw createApiError(
        "无效的参数：contentId和refId不能为空",
        400,
        "INVALID_PARAMS",
      );
    }

    const cacheKey = `paragraph-${contentId}-${refId}`;

    // 尝试从缓存获取
    const cached = referenceCache.get<SourceParagraph>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await withRetry(async () => {
        return await client.get<SourceParagraph>(
          `/api/v1/content/${contentId}/paragraphs/${refId}`,
        );
      }, 1); // 单个段落请求只重试1次

      // 缓存结果
      if (response) {
        referenceCache.set(cacheKey, response, 15 * 60 * 1000); // 15分钟缓存
      }

      return response;
    } catch (error) {
      console.error(`Failed to fetch paragraph ${refId}:`, error);

      // 404错误返回null，其他错误抛出
      if ((error as any)?.status === 404) {
        return null;
      }

      throw createApiError(
        `无法获取段落 ${refId}`,
        (error as any)?.status,
        "FETCH_PARAGRAPH_FAILED",
      );
    }
  },

  /**
   * 批量获取多个引用段落（智能缓存策略）
   */
  async getParagraphsByRefs(
    contentId: string,
    refIds: number[],
  ): Promise<SourceParagraph[]> {
    if (!contentId || !refIds?.length) {
      return [];
    }

    // 去重并排序
    const uniqueRefIds = [...new Set(refIds)].sort((a, b) => a - b);
    const cacheKey = `paragraphs-${contentId}-${uniqueRefIds.join(",")}`;

    // 尝试从缓存获取完整结果
    const cached = referenceCache.get<SourceParagraph[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 检查单个段落缓存，减少API调用
    const results: SourceParagraph[] = [];
    const missingRefIds: number[] = [];

    for (const refId of uniqueRefIds) {
      const singleCacheKey = `paragraph-${contentId}-${refId}`;
      const cachedParagraph =
        referenceCache.get<SourceParagraph>(singleCacheKey);

      if (cachedParagraph) {
        results.push(cachedParagraph);
      } else {
        missingRefIds.push(refId);
      }
    }

    // 如果所有段落都在缓存中，直接返回
    if (missingRefIds.length === 0) {
      return results;
    }

    try {
      // 只请求缺失的段落
      const response = await withRetry(async () => {
        return await client.post<SourceParagraph[]>(
          `/api/v1/content/${contentId}/paragraphs/batch`,
          { refIds: missingRefIds },
        );
      });

      // 缓存新获取的段落
      response.forEach((paragraph) => {
        const singleCacheKey = `paragraph-${contentId}-${paragraph.index}`;
        referenceCache.set(singleCacheKey, paragraph, 15 * 60 * 1000);
      });

      // 合并结果并按refIds顺序排序
      const allResults = [...results, ...response];
      const sortedResults = uniqueRefIds
        .map((refId) => allResults.find((p) => p.index === refId))
        .filter(Boolean) as SourceParagraph[];

      // 缓存完整结果
      referenceCache.set(cacheKey, sortedResults, 10 * 60 * 1000); // 10分钟缓存

      return sortedResults;
    } catch (error) {
      console.error("Failed to fetch paragraphs by refs:", error);
      // 返回已缓存的部分结果，而不是空数组
      return results;
    }
  },

  /**
   * 搜索包含特定文本的段落（带缓存）
   */
  async searchParagraphs(
    contentId: string,
    query: string,
  ): Promise<SourceParagraph[]> {
    if (!contentId || !query?.trim()) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `search-${contentId}-${normalizedQuery}`;

    // 尝试从缓存获取
    const cached = referenceCache.get<SourceParagraph[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await withRetry(async () => {
        return await client.get<SourceParagraph[]>(
          `/api/v1/content/${contentId}/paragraphs/search`,
          { q: query },
        );
      });

      // 缓存搜索结果（较短的缓存时间）
      referenceCache.set(cacheKey, response, 5 * 60 * 1000); // 5分钟缓存

      return response;
    } catch (error) {
      console.error("Failed to search paragraphs:", error);
      return [];
    }
  },

  /**
   * 获取段落的上下文（前后几段）
   */
  async getParagraphContext(
    contentId: string,
    refId: number,
    contextSize: number = 2,
  ): Promise<{
    target: SourceParagraph;
    context: SourceParagraph[];
  } | null> {
    if (!contentId || !refId || refId < 1 || contextSize < 0) {
      return null;
    }

    const cacheKey = `context-${contentId}-${refId}-${contextSize}`;

    // 尝试从缓存获取
    const cached = referenceCache.get<{
      target: SourceParagraph;
      context: SourceParagraph[];
    }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await withRetry(async () => {
        return await client.get<{
          target: SourceParagraph;
          context: SourceParagraph[];
        }>(`/api/v1/content/${contentId}/paragraphs/${refId}/context`, {
          size: contextSize,
        });
      }, 1); // 上下文请求只重试1次

      // 缓存结果
      if (response) {
        referenceCache.set(cacheKey, response, 10 * 60 * 1000); // 10分钟缓存
      }

      return response;
    } catch (error) {
      console.error(`Failed to fetch paragraph context for ${refId}:`, error);
      return null;
    }
  },

  /**
   * 清除缓存
   */
  clearCache() {
    referenceCache.clear();
  },

  /**
   * 清除特定内容的缓存
   */
  clearContentCache(contentId: string) {
    // 清除所有包含该contentId的缓存项
    const keysToDelete: string[] = [];
    referenceCache["cache"].forEach((_, key) => {
      if (key.includes(contentId)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      referenceCache["cache"].delete(key);
    });
  },
};
