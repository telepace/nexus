import { client } from "@/app/openapi-client/sdk.gen";
import logger from "./logger";
import checkApiHealth from "./apiHealthCheck";

// 定义ResponseType类型，表示可能的响应数据类型
type ResponseType = unknown;
// 定义请求函数类型
type RequestFunction<T = ResponseType> = () => Promise<T>;

// 请求去重与缓存管理
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<ResponseType>>();
  private responseCache = new Map<string, ResponseType>();
  private cacheExpiry = new Map<string, number>();
  
  constructor(private cacheTTL = 5000) {}
  
  /**
   * 对请求进行去重和缓存处理
   * @param key 请求唯一标识
   * @param requestFn 执行请求的函数
   * @returns 请求结果
   */
  async deduplicate<T = ResponseType>(key: string, requestFn: RequestFunction<T>): Promise<T> {
    // 检查缓存是否有效
    if (this.responseCache.has(key) && Date.now() < this.cacheExpiry.get(key)!) {
      logger.info(`✅ 使用缓存响应: ${key}`);
      return this.responseCache.get(key) as T;
    }
    
    // 如果已有相同请求正在进行中，返回已有请求的Promise
    if (this.pendingRequests.has(key)) {
      logger.info(`🔄 复用正在进行的请求: ${key}`);
      return this.pendingRequests.get(key) as Promise<T>;
    }
    
    // 执行新请求
    const requestPromise = (async () => {
      try {
        logger.info(`🚀 发起新请求: ${key}`);
        const result = await requestFn();
        
        // 缓存结果
        this.responseCache.set(key, result as unknown as ResponseType);
        this.cacheExpiry.set(key, Date.now() + this.cacheTTL);
        
        return result;
      } finally {
        // 请求完成后，移除进行中的记录
        this.pendingRequests.delete(key);
      }
    })();
    
    // 记录进行中的请求
    this.pendingRequests.set(key, requestPromise as Promise<ResponseType>);
    return requestPromise;
  }
  
  /**
   * 清除特定请求的缓存
   */
  invalidateCache(key: string): void {
    if (this.responseCache.has(key)) {
      this.responseCache.delete(key);
      this.cacheExpiry.delete(key);
      logger.info(`🗑️ 已清除缓存: ${key}`);
    }
  }
  
  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.responseCache.clear();
    this.cacheExpiry.clear();
    logger.info('🧹 已清除所有缓存');
  }
}

const requestDeduplicator = new RequestDeduplicator();

// 配置客户端
const configureClient = () => {
  try {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    logger.info(`🌐 环境: ${process.env.NODE_ENV}`);
    logger.info(`🌐 API Base URL: ${baseURL}`);
    
    // 配置客户端
    client.setConfig({
      baseURL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      validateStatus: status => status >= 200 && status < 500
    });
    
    // 为底层的axios实例添加拦截器（如果需要）
    // 这里需要从client实现中获取axios实例，我们先跳过这部分
    // 当我们需要添加拦截器时，需要查看@hey-api/client-axios的实现细节
    
    logger.success("🔌 API连接信息:");
    logger.api(`🔗 Base URL: ${baseURL}`);
    logger.api(`⏱️ 超时设置: 15000ms`);
    logger.success("✅ API客户端已配置完成");
    
    // 检查API健康状态
    if (process.env.NODE_ENV === "development") {
      try {
        checkApiHealth(baseURL).then(isHealthy => {
          if (!isHealthy) {
            logger.warn("⚠️ API服务可能不可用，请检查后端服务是否正常运行");
            logger.warn(`⚠️ 尝试连接: ${baseURL}`);
          }
        }).catch(error => {
          logger.error("❌ 执行API健康检查时发生错误");
          logger.error(error instanceof Error ? error.message : "未知错误");
        });
      } catch (error) {
        logger.error("❌ 执行API健康检查时发生错误");
        logger.error(error instanceof Error ? error.message : "未知错误");
      }
    }
  } catch (error) {
    logger.error("❌ 配置API客户端时出错");
    logger.error(error instanceof Error ? error.message : "未知错误");
  }
};

// 执行初始化
configureClient();

export { requestDeduplicator };
