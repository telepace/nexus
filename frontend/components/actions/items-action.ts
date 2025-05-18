"use server";

import {
  readItems,
  readItem,
  deleteItem,
  createItem,
} from "@/app/clientService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { itemSchema } from "@/lib/definitions";
import { cache } from "react";
import { getAuthToken, requireAuth } from "@/lib/server-auth-bridge";

// 定义Item数据类型
interface ItemData {
  id: string;
  title: string;
  description?: string;
  [key: string]: unknown;
}

// 定义API错误响应类型
interface ApiErrorResponse {
  error?: string | null;
  message?: string;
  meta?: { message?: string } | null;
  status?: number;
}

// 定义API响应类型
interface ApiResponse<T> {
  data?: T | { data?: T } | null;
  meta?: { message?: string } | null;
  error?: string | null;
}

type DataResponse = {
  data?: ItemData[] | { data?: ItemData[] } | unknown;
  meta?: { message?: string } | null;
  error?: string | null;
};

// 定义 fetchItems 的可能返回类型
type FetchItemsReturn = ItemData[] | ApiErrorResponse;

// 缓存结果和上次请求时间
let itemsCache: FetchItemsReturn | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3000; // 3秒缓存

// 使用 React cache 和认证缓存
export const fetchItems = cache(async (): Promise<FetchItemsReturn> => {
  const now = Date.now();
  const requestId = `fetchItems-${Math.random().toString(36).substring(7)}`;

  console.log(`[${requestId}] fetchItems 开始执行...`);

  // 验证用户认证状态
  const user = await requireAuth();
  if (!user) {
    console.log(`[${requestId}] 用户未认证，重定向到登录页`);
    redirect("/login");
  }

  // 使用缓存如果在有效期内
  if (itemsCache && now - lastFetchTime < CACHE_TTL) {
    console.log(
      `[${requestId}] 返回缓存的物品数据，缓存时间: ${new Date(lastFetchTime).toISOString()}`,
    );
    return itemsCache;
  }

  // 获取 token
  const token = await getAuthToken();

  if (!token) {
    console.log(`[${requestId}] 未找到 token，重定向到登录页`);
    redirect("/login");
  }

  try {
    console.log(
      `[${requestId}] 获取物品数据，token: ${token.substring(0, 5)}...`,
    );

    const response = await readItems({
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

    const { data, error } = response;

    // 增强的错误处理
    if (error) {
      console.error(`[${requestId}] API 错误:`, error || "空错误对象");
      const errorResult = {
        error:
          typeof error === "string"
            ? error
            : error
              ? JSON.stringify(error)
              : "未知API错误",
        status: 500,
      };
      itemsCache = errorResult;
      lastFetchTime = now;
      return errorResult;
    }

    // 如果API返回的数据为空或无效，返回适当的错误信息
    if (!data) {
      console.warn(`[${requestId}] API 未返回数据`);
      const errorResult = { error: "API未返回数据", status: 404 };
      itemsCache = errorResult;
      lastFetchTime = now;
      return errorResult;
    }

    // 处理嵌套的数据结构
    const responseData = data as ApiResponse<ItemData[]>;
    let result: FetchItemsReturn;

    if (
      responseData &&
      responseData.data &&
      typeof responseData.data === "object" &&
      "data" in responseData.data &&
      Array.isArray(responseData.data.data)
    ) {
      result = responseData.data.data;
    } else if (
      responseData &&
      responseData.data &&
      Array.isArray(responseData.data)
    ) {
      result = responseData.data;
    } else if (Array.isArray(responseData)) {
      result = responseData;
    } else if (responseData && responseData.error) {
      result = { error: responseData.error };
    } else {
      console.warn(`[${requestId}] 意外的 API 响应格式:`, data);
      result = { error: "API返回了意外的数据格式", status: 400 };
    }

    // 更新缓存
    itemsCache = result;
    lastFetchTime = now;

    console.log(
      `[${requestId}] fetchItems 执行完成，数据${Array.isArray(result) ? `长度: ${result.length}` : "是错误对象"}`,
    );
    return result;
  } catch (error) {
    console.error(`[${requestId}] 获取物品数据出错:`, error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const errorResult = { error: `获取数据失败: ${errorMessage}`, status: 500 };

    // 缓存错误也是一种防止重复请求的方式
    itemsCache = errorResult;
    lastFetchTime = now;

    return errorResult;
  }
});

// 其他函数也增加缓存和认证机制
export const fetchItem = cache(async (id: string) => {
  // 验证用户
  const user = await requireAuth();
  if (!user) {
    redirect("/login");
  }

  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  try {
    const { data, error } = await readItem({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        id: id,
      },
    });

    if (error) {
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    return data?.data;
  } catch (error) {
    console.error("获取物品详情出错:", error);
    return { error: "获取数据失败" };
  }
});

export async function removeItem(id: string) {
  // 验证用户
  const user = await requireAuth();
  if (!user) {
    redirect("/login");
  }

  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  try {
    const { data, error } = await deleteItem({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        id: id,
      },
    });

    if (error) {
      console.error("删除物品出错:", error);
      return { message: error };
    }

    console.log("删除物品成功:", data);

    // 清除缓存以便重新加载
    itemsCache = null;
    lastFetchTime = 0;

    // 重新验证路径，但不重复渲染
    revalidatePath("/dashboard");

    // 处理嵌套结构
    const responseData = data as DataResponse;

    if (
      responseData &&
      responseData.meta &&
      typeof responseData.meta === "object" &&
      "message" in responseData.meta
    ) {
      return responseData.meta.message;
    } else if (
      responseData &&
      responseData.data &&
      typeof responseData.data === "object"
    ) {
      const nestedData = responseData.data as DataResponse;
      if (
        nestedData.meta &&
        typeof nestedData.meta === "object" &&
        "message" in nestedData.meta
      ) {
        return nestedData.meta.message;
      }
    }

    return "物品已成功删除";
  } catch (error) {
    console.error("删除物品时出错:", error);
    return { message: "删除物品失败" };
  }
}

export async function addItem(prevState: {}, formData: FormData) {
  // 验证用户
  const user = await requireAuth();
  if (!user) {
    redirect("/login");
  }

  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const validatedFields = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description } = validatedFields.data;

  const input = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      title,
      description,
    },
  };

  try {
    const response = await createItem(input);
    console.log("添加物品API响应:", response);

    const { data, error } = response;

    // 检查API错误
    if (error) {
      console.error("API 错误:", error);
      return {
        message:
          typeof error === "string"
            ? `添加物品失败: ${error}`
            : `添加物品失败: ${JSON.stringify(error)}`,
      };
    }

    // 如果存在data但也存在data.error，返回该错误
    if (data?.error) {
      console.error("API 数据错误:", data.error);
      return { message: `添加物品失败: ${data.error}` };
    }

    // 清除缓存以便重新加载
    itemsCache = null;
    lastFetchTime = 0;

    // 重新验证路径
    revalidatePath("/dashboard");

    // 成功添加物品，如果data包含物品信息，确认成功
    if (data?.data && typeof data.data === "object") {
      console.log("物品添加成功:", data.data);

      // 检查是否有成功消息
      let successMessage = "物品添加成功";
      if (data.meta?.message && typeof data.meta.message === "string") {
        successMessage = data.meta.message;
      }

      // 通常我们应该重定向到dashboard，但为了确认成功，我们可以返回消息
      return { message: successMessage, success: true };
    }

    // 重定向到Dashboard
    redirect(`/dashboard`);
  } catch (error) {
    console.error("添加物品时出错:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { message: `添加物品失败: ${errorMessage}` };
  }
}
