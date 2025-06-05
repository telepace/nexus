"use server";

import {
  contentListContentItemsEndpoint,
  contentGetContentItemEndpoint,
  contentCreateContentItemEndpoint,
  itemsDeleteItem,
  itemsCreateItem,
} from "@/app/openapi-client/index";
import { ContentItemPublic, ContentItemCreate } from "@/app/openapi-client/index";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuthToken, requireAuth } from "@/lib/server-auth-bridge";
import { itemSchema } from "@/lib/definitions";

// 定义API错误响应类型
interface ApiErrorResponse {
  error?: string | null;
  message?: string;
  meta?: { message?: string } | null;
  status?: number;
}

// 定义数据响应类型
interface DataResponse {
  data?: unknown;
  meta?: { message?: string } | null;
  error?: string | null;
}

// 定义 fetchItems 的可能返回类型
type FetchItemsReturn = ContentItemPublic[] | ApiErrorResponse;

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

    // content API 直接返回 ContentItemPublic[]
    if (Array.isArray(response)) {
      itemsCache = response;
      lastFetchTime = now;
      console.log(
        `[${requestId}] fetchItems 执行完成，数据长度: ${response.length}`,
      );
      return response;
    } else {
      console.warn(`[${requestId}] 意外的 API 响应格式:`, response);
      const errorResult = { error: "API返回了意外的数据格式", status: 400 };
      itemsCache = errorResult;
      lastFetchTime = now;
      return errorResult;
    }
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

// 其他函数也更新为使用content API
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
    const response = await contentGetContentItemEndpoint({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        id: id,
      },
    });

    return response;
  } catch (error) {
    console.error("获取单个物品数据出错:", error);
    throw error;
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
    const response = await itemsDeleteItem({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        id: id,
      },
    });

    console.log("删除物品成功:", response);

    // 清除缓存以便重新加载
    itemsCache = null;
    lastFetchTime = 0;

    // 重新验证路径，但不重复渲染
    revalidatePath("/content-library");

    // 处理响应结构
    if (response && typeof response === "object") {
      const responseData = response as DataResponse;
      
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
    }

    return "物品已成功删除";
  } catch (error) {
    console.error("删除物品时出错:", error);
    return { message: "删除物品失败" };
  }
}

export async function addItem(
  prevState: Record<string, never>,
  formData: FormData,
) {
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

  try {
    const response = await itemsCreateItem({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        title,
        description,
      },
    });
    
    console.log("添加物品API响应:", response);

    // 清除缓存以便重新加载
    itemsCache = null;
    lastFetchTime = 0;

    // 重新验证路径
    revalidatePath("/content-library");

    // 成功添加物品
    if (response && typeof response === "object") {
      console.log("物品添加成功:", response);

      // 检查是否有成功消息
      let successMessage = "物品添加成功";
      const responseData = response as DataResponse;
      if (responseData.meta?.message && typeof responseData.meta.message === "string") {
        successMessage = responseData.meta.message;
      }

      // 通常我们应该重定向到dashboard，但为了确认成功，我们可以返回消息
      return { message: successMessage, success: true };
    }

    // 重定向到Content Library
    redirect(`/content-library`);
  } catch (error) {
    console.error("添加物品时出错:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { message: `添加物品失败: ${errorMessage}` };
  }
}
