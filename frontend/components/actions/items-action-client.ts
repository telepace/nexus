"use client";

import { contentListContentItemsEndpoint } from "@/app/openapi-client/index";
import { ContentItemPublic } from "@/app/openapi-client/index";
import { getCookie } from "@/lib/client-auth";

// 定义API错误响应类型
interface ApiErrorResponse {
  error?: string | null;
  message?: string;
  meta?: { message?: string } | null;
  status?: number;
}

// 定义 fetchItems 的可能返回类型
type FetchItemsReturn = ContentItemPublic[] | ApiErrorResponse;

// 缓存结果和上次请求时间
let itemsCache: FetchItemsReturn | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3000; // 3秒缓存

// 客户端版本的 fetchItems
export const fetchItems = async (): Promise<FetchItemsReturn> => {
  const now = Date.now();
  const requestId = `fetchItems-client-${Math.random().toString(36).substring(7)}`;

  console.log(`[${requestId}] fetchItems 客户端版本开始执行...`);

  // 使用缓存如果在有效期内
  if (itemsCache && now - lastFetchTime < CACHE_TTL) {
    console.log(
      `[${requestId}] 返回缓存的物品数据，缓存时间: ${new Date(lastFetchTime).toISOString()}`,
    );
    return itemsCache;
  }

  // 获取 token
  const token = getCookie("accessToken");

  if (!token) {
    console.log(`[${requestId}] 未找到 token`);
    const errorResult = { error: "未找到认证令牌", status: 401 };
    itemsCache = errorResult;
    lastFetchTime = now;
    return errorResult;
  }

  try {
    console.log(
      `[${requestId}] 获取物品数据，token: ${token.substring(0, 5)}...`,
    );

    const response = await contentListContentItemsEndpoint({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 检查响应是否为空或无效
    if (!response) {
      console.error(`[${requestId}] API 返回空响应`);
      const errorResult = { error: "服务器返回空响应" };
      itemsCache = errorResult;
      lastFetchTime = now;
      return errorResult;
    }

    // 处理直接数组格式 - 这是期望的格式
    if (Array.isArray(response)) {
      itemsCache = response;
      lastFetchTime = now;
      console.log(
        `[${requestId}] fetchItems 执行完成，数据长度: ${response.length}`,
      );
      return response;
    }

    // 处理包装格式的响应（例如 {data: [...], meta: {...}}）
    if (response && typeof response === "object") {
      // 检查是否有 data 字段包含数组
      if ("data" in response && Array.isArray(response.data)) {
        console.log(`[${requestId}] 检测到包装格式响应，提取 data 字段`);
        itemsCache = response.data;
        lastFetchTime = now;
        return response.data;
      }

      // 检查是否有 items 字段包含数组
      if ("items" in response && Array.isArray(response.items)) {
        console.log(`[${requestId}] 检测到包装格式响应，提取 items 字段`);
        itemsCache = response.items;
        lastFetchTime = now;
        return response.items;
      }

      // 检查是否是错误响应格式
      const errorResponse = response as ApiErrorResponse;
      let errorMessage = "未知错误";

      if (errorResponse.error) {
        errorMessage = String(errorResponse.error);
      } else if (errorResponse.message) {
        errorMessage = String(errorResponse.message);
      } else if (errorResponse.meta && errorResponse.meta.message) {
        errorMessage = String(errorResponse.meta.message);
      } else {
        // 如果不是明确的错误格式，但也不是数组，记录详细信息
        console.warn(
          `[${requestId}] 意外的 API 响应格式:`,
          JSON.stringify(response, null, 2),
        );
        errorMessage = `API返回了意外的数据格式: ${typeof response}`;
      }

      const errorResult = { error: errorMessage, status: 400 };
      itemsCache = errorResult;
      lastFetchTime = now;
      return errorResult;
    }

    // 其他类型的响应
    console.warn(
      `[${requestId}] 完全意外的响应类型:`,
      typeof response,
      response,
    );
    const errorResult = {
      error: `API返回了完全意外的数据类型: ${typeof response}`,
      status: 400,
    };
    itemsCache = errorResult;
    lastFetchTime = now;
    return errorResult;
  } catch (error) {
    console.error(`[${requestId}] 获取物品数据出错:`, error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const errorResult = { error: `获取数据失败: ${errorMessage}`, status: 500 };

    // 缓存错误也是一种防止重复请求的方式
    itemsCache = errorResult;
    lastFetchTime = now;

    return errorResult;
  }
};
