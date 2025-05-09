/**
 * 声明 chrome API 类型
 */
declare const chrome: {
  storage: {
    local: {
      get: (key: string | string[] | object, callback: (result: Record<string, any>) => void) => void
      set: (data: Record<string, any>, callback?: () => void) => void
      remove: (keys: string | string[], callback?: () => void) => void
      clear: (callback?: () => void) => void
    }
  }
}

/**
 * 浏览器扩展存储工具类
 */
export const Storage = {
  /**
   * 保存数据到浏览器存储
   * @param key 存储键
   * @param value 要存储的值
   */
  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve()
      })
    })
  },

  /**
   * 从浏览器存储中获取数据
   * @param key 存储键
   * @returns 存储的值，如果不存在则返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null)
      })
    })
  },

  /**
   * 从浏览器存储中删除数据
   * @param key 存储键
   */
  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve()
      })
    })
  },

  /**
   * 清除所有浏览器存储的数据
   */
  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve()
      })
    })
  }
} 