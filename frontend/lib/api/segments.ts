import { client } from './client';

export interface ContentSegment {
  id: string;
  content_item_id: string;
  display_number: number;
  content: string;
  start_offset?: number;
  end_offset?: number;
  created_at: string;
  updated_at: string;
}

export interface ContentSegmentBulkResponse {
  segments: ContentSegment[];
  total: number;
  missing_numbers: number[];
}

/**
 * 获取单个段落
 */
export async function getContentSegment(
  contentId: string,
  segmentNumber: number
): Promise<ContentSegment> {
  const response = await client.get<ContentSegment>(
    `/api/v1/content/${contentId}/segments/${segmentNumber}`
  );
  return response.data;
}

/**
 * 批量获取段落 - 指定段落号列表
 */
export async function getContentSegmentsByNumbers(
  contentId: string,
  numbers: number[]
): Promise<ContentSegmentBulkResponse> {
  const numbersStr = numbers.join(',');
  const response = await client.get<ContentSegmentBulkResponse>(
    `/api/v1/content/${contentId}/segments?numbers=${numbersStr}`
  );
  return response.data;
}

/**
 * 批量获取段落 - 区间查询
 */
export async function getContentSegmentsByRange(
  contentId: string,
  fromNumber: number,
  toNumber: number
): Promise<ContentSegmentBulkResponse> {
  const response = await client.get<ContentSegmentBulkResponse>(
    `/api/v1/content/${contentId}/segments?from_number=${fromNumber}&to_number=${toNumber}`
  );
  return response.data;
}

/**
 * 获取所有段落
 */
export async function getAllContentSegments(
  contentId: string
): Promise<ContentSegmentBulkResponse> {
  const response = await client.get<ContentSegmentBulkResponse>(
    `/api/v1/content/${contentId}/segments`
  );
  return response.data;
}

/**
 * 解析引用字符串并获取对应段落
 */
export async function getSegmentsByRef(
  contentId: string,
  refString: string
): Promise<ContentSegmentBulkResponse> {
  const numbers = parseReferenceString(refString);
  
  if (numbers.length === 0) {
    return { segments: [], total: 0, missing_numbers: [] };
  }

  // 检查是否为连续区间
  const sortedNumbers = [...numbers].sort((a, b) => a - b);
  const isConsecutive = sortedNumbers.every((num, index) => 
    index === 0 || num === sortedNumbers[index - 1] + 1
  );

  if (isConsecutive && sortedNumbers.length > 1) {
    // 使用区间查询优化
    return getContentSegmentsByRange(contentId, sortedNumbers[0], sortedNumbers[sortedNumbers.length - 1]);
  } else {
    // 使用数字列表查询
    return getContentSegmentsByNumbers(contentId, numbers);
  }
}

/**
 * 解析引用字符串为段落号数组
 * 支持格式：
 * - 单号：'6' → [6]
 * - 区间：'6-24' → [6,7,...,24]
 * - 混合：'2,5-7,10' → [2,5,6,7,10]
 */
export function parseReferenceString(refString?: string): number[] {
  if (!refString) return [];

  const refs: number[] = [];

  refString.split(',').forEach(segment => {
    const part = segment.trim();
    if (!part) return;

    // 区间格式 例如 "6-24"
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const [from, to] = start <= end ? [start, end] : [end, start];
        for (let i = from; i <= to; i++) {
          refs.push(i);
        }
      }
    } else {
      // 单个数字
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        refs.push(num);
      }
    }
  });

  // 去重并升序排序
  return [...new Set(refs)].sort((a, b) => a - b);
}

/**
 * 格式化段落内容预览（用于悬浮显示）
 */
export function formatSegmentPreview(segment: ContentSegment, maxLength = 100): string {
  const content = segment.content.trim();
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}

/**
 * 缓存管理
 */
class SegmentCache {
  private cache = new Map<string, ContentSegment>();
  private readonly maxSize = 200; // 最多缓存200个段落

  private getCacheKey(contentId: string, segmentNumber: number): string {
    return `${contentId}:${segmentNumber}`;
  }

  get(contentId: string, segmentNumber: number): ContentSegment | undefined {
    return this.cache.get(this.getCacheKey(contentId, segmentNumber));
  }

  set(segment: ContentSegment): void {
    const key = this.getCacheKey(segment.content_item_id, segment.display_number);
    
    // 如果缓存已满，删除最老的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, segment);
  }

  setMultiple(segments: ContentSegment[]): void {
    segments.forEach(segment => this.set(segment));
  }

  clear(contentId?: string): void {
    if (contentId) {
      // 清除特定内容的缓存
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${contentId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 清除所有缓存
      this.cache.clear();
    }
  }
}

export const segmentCache = new SegmentCache();

/**
 * 带缓存的段落获取
 */
export async function getCachedContentSegment(
  contentId: string,
  segmentNumber: number
): Promise<ContentSegment> {
  // 先尝试从缓存获取
  const cached = segmentCache.get(contentId, segmentNumber);
  if (cached) {
    return cached;
  }

  // 缓存未命中，从API获取
  const segment = await getContentSegment(contentId, segmentNumber);
  segmentCache.set(segment);
  return segment;
}

/**
 * 带缓存的批量段落获取
 */
export async function getCachedSegmentsByRef(
  contentId: string,
  refString: string
): Promise<ContentSegmentBulkResponse> {
  const numbers = parseReferenceString(refString);
  
  if (numbers.length === 0) {
    return { segments: [], total: 0, missing_numbers: [] };
  }

  // 检查缓存中已有的段落
  const cachedSegments: ContentSegment[] = [];
  const missingNumbers: number[] = [];

  numbers.forEach(num => {
    const cached = segmentCache.get(contentId, num);
    if (cached) {
      cachedSegments.push(cached);
    } else {
      missingNumbers.push(num);
    }
  });

  // 如果全部都在缓存中，直接返回
  if (missingNumbers.length === 0) {
    return {
      segments: cachedSegments.sort((a, b) => a.display_number - b.display_number),
      total: cachedSegments.length,
      missing_numbers: []
    };
  }

  try {
    // 获取缺失的段落
    const response = await getContentSegmentsByNumbers(contentId, missingNumbers);
    
    // 更新缓存
    segmentCache.setMultiple(response.segments);
    
    // 合并缓存和新获取的段落
    const allSegments = [...cachedSegments, ...response.segments]
      .sort((a, b) => a.display_number - b.display_number);

    return {
      segments: allSegments,
      total: allSegments.length,
      missing_numbers: response.missing_numbers
    };
  } catch (error) {
    // 如果 API 调用失败（比如认证问题），返回缓存的段落
    console.warn('Failed to fetch segments from API, returning cached data only:', error);
    
    return {
      segments: cachedSegments.sort((a, b) => a.display_number - b.display_number),
      total: cachedSegments.length,
      missing_numbers: missingNumbers // 标记未能获取的段落
    };
  }
} 