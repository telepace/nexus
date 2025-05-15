import { client } from "@/app/openapi-client/sdk.gen";
import logger from "./logger";
import checkApiHealth from "./apiHealthCheck";

const configureClient = async () => {
  // Default to localhost for development, but this should be overridden in production
  const baseURL =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:8000";

  client.setConfig({
    baseURL: baseURL,
    timeout: 10000, // 10 seconds timeout
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Print API connection information to the terminal
  logger.success("🔌 API连接信息:");
  logger.api(`📡 API基础URL: ${baseURL}`);
  logger.api(`⏱️ 超时设置: 10000ms`);
  logger.success("✅ API客户端已配置完成");

  // 在开发环境中执行API健康检查
  if (process.env.NODE_ENV === "development") {
    try {
      const isHealthy = await checkApiHealth(baseURL);
      if (!isHealthy) {
        logger.warn("⚠️ API服务可能不可用，请检查后端服务是否正常运行");
        logger.warn(`⚠️ 建议检查后端服务: ${baseURL}`);
      }
    } catch (error) {
      logger.error("❌ 执行API健康检查时发生错误");
    }
  }
};

// 立即执行配置
configureClient().catch((error) => {
  logger.error(
    `❌ 配置API客户端时发生错误: ${error instanceof Error ? error.message : String(error)}`,
  );
});
