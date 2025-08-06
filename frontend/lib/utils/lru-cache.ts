export interface CacheStats {
  totalRequests: number;
  hits: number;
  hitRate: number;
  cacheSize: number;
}

/**
 * LRU (Least Recently Used) 缓存实现
 * 当缓存达到最大容量时，会删除最久未使用的项
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, V>();
  private totalRequests = 0;
  private hits = 0;

  constructor(maxSize: number) {
    this.maxSize = Math.max(0, maxSize);
  }

  /**
   * 获取值
   * @param key 键
   * @returns 值，如果不存在则返回undefined
   */
  get(key: K): V | undefined {
    this.totalRequests++;

    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      // LRU: 将访问的项移到最后（最新）
      this.cache.delete(key);
      this.cache.set(key, value);
    }

    return value;
  }

  /**
   * 设置键值对
   * @param key 键
   * @param value 值
   */
  set(key: K, value: V): void {
    if (this.maxSize === 0) {
      return; // 容量为0，不存储任何内容
    }

    if (this.cache.has(key)) {
      // 更新现有键的值
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最久未使用的项（第一个项）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * 获取缓存大小
   * @returns 当前缓存中的项数
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStats(): CacheStats {
    return {
      totalRequests: this.totalRequests,
      hits: this.hits,
      hitRate: this.totalRequests > 0 ? this.hits / this.totalRequests : 0,
      cacheSize: this.cache.size,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.totalRequests = 0;
    this.hits = 0;
  }

  /**
   * 检查键是否存在
   * @param key 键
   * @returns 是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除指定键
   * @param key 键
   * @returns 是否成功删除
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 获取所有键
   * @returns 键的迭代器
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 获取所有值
   * @returns 值的迭代器
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }
}
