import logger from "./logger";

/**
 * 检查API服务是否可访问
 * @param baseUrl API基础URL
 * @returns 如果API服务可访问，则返回true；否则返回false
 */
export const checkApiHealth = async (baseUrl: string): Promise<boolean> => {
  try {
    // 尝试访问健康检查端点 - 使用正确的后端路径
    const response = await fetch(`${baseUrl}/api/v1/utils/health-check/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 设置较短的超时时间，以便快速检测
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      logger.success(`✅ API服务健康检查通过: ${baseUrl}`);
      return true;
    } else {
      logger.error(`❌ API服务返回非成功状态码: ${response.status}`);
      return false;
    }
  } catch (error) {
    logger.error(`❌ API服务无法连接: ${baseUrl}`);
    logger.error(
      `❌ 错误详情: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
};

export default checkApiHealth;
