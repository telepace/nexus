"use server";

import {
  readPrompts,
  readPrompt,
  createPrompt,
  updatePrompt,
  deletePrompt,
  readTags,
  createTag,
  updateTag,
  deleteTag,
  readPromptVersions,
  duplicatePrompt,
} from "@/app/clientService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuthToken, requireAuth } from "@/lib/server-auth-bridge";

// 定义Prompt和Tag数据类型
interface TagData {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface InputVariable {
  name: string;
  description?: string;
  required?: boolean;
}

interface PromptData {
  id: string;
  name: string;
  description?: string;
  content: string;
  type: string;
  input_vars?: InputVariable[];
  visibility: string;
  team_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags?: TagData[];
}

interface PromptVersionData {
  id: string;
  prompt_id: string;
  version: number;
  content: string;
  input_vars?: InputVariable[];
  created_by: string;
  created_at: string;
  change_notes?: string;
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

// 定义 fetchPrompts 的可能返回类型
type FetchPromptsReturn = PromptData[] | ApiErrorResponse;
type FetchTagsReturn = TagData[] | ApiErrorResponse;

// 缓存结果和上次请求时间
let promptsCache: FetchPromptsReturn | null = null;
let tagsCache: FetchTagsReturn | null = null;
let lastPromptsFetchTime = 0;
let lastTagsFetchTime = 0;
const CACHE_TTL = 3000; // 3秒缓存

// 获取所有Prompts
export const fetchPrompts = async (options?: {
  search?: string;
  tag_ids?: string[];
  sort?: string;
  order?: "asc" | "desc";
}): Promise<FetchPromptsReturn> => {
  const now = Date.now();
  const requestId = `fetchPrompts-${Math.random().toString(36).substring(7)}`;

  console.log(`[${requestId}] fetchPrompts 开始执行...`);

  // 验证用户认证状态
  const user = await requireAuth();
  if (!user) {
    console.log(`[${requestId}] 用户未认证，重定向到登录页`);
    redirect("/login");
  }

  // 如果没有特殊查询参数且缓存有效，使用缓存
  if (!options && promptsCache && now - lastPromptsFetchTime < CACHE_TTL) {
    console.log(
      `[${requestId}] 返回缓存的prompts数据，缓存时间: ${new Date(lastPromptsFetchTime).toISOString()}`,
    );
    return promptsCache;
  }

  // 获取 token
  const token = await getAuthToken();

  if (!token) {
    console.log(`[${requestId}] 未找到 token，重定向到登录页`);
    redirect("/login");
  }

  try {
    console.log(
      `[${requestId}] 获取prompts数据，token: ${token.substring(0, 5)}...`,
    );

    const response = await readPrompts({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      query: {
        search: options?.search,
        tag_ids: options?.tag_ids,
        sort: options?.sort,
        order: options?.order || "desc",
      },
    });

    // 检查响应是否为空或无效
    if (!response) {
      console.error(`[${requestId}] API 返回空响应`);
      const errorResult = { error: "服务器返回空响应" };
      if (!options) {
        promptsCache = errorResult;
        lastPromptsFetchTime = now;
      }
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
      if (!options) {
        promptsCache = errorResult;
        lastPromptsFetchTime = now;
      }
      return errorResult;
    }

    // 如果API返回的数据为空或无效，返回适当的错误信息
    if (!data) {
      console.warn(`[${requestId}] API 未返回数据`);
      const errorResult = { error: "API未返回数据", status: 404 };
      if (!options) {
        promptsCache = errorResult;
        lastPromptsFetchTime = now;
      }
      return errorResult;
    }

    // 处理数据
    let result: FetchPromptsReturn;

    if (Array.isArray(data)) {
      result = data;
    } else if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      Array.isArray(data.data)
    ) {
      result = data.data;
    } else {
      console.warn(`[${requestId}] 意外的 API 响应格式:`, data);
      result = { error: "API返回了意外的数据格式", status: 400 };
    }

    // 只有在不带过滤条件的情况下才更新缓存
    if (!options) {
      promptsCache = result;
      lastPromptsFetchTime = now;
    }

    console.log(
      `[${requestId}] fetchPrompts 执行完成，数据${Array.isArray(result) ? `长度: ${result.length}` : "是错误对象"}`,
    );
    return result;
  } catch (error) {
    console.error(`[${requestId}] 获取prompts数据出错:`, error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const errorResult = { error: `获取数据失败: ${errorMessage}`, status: 500 };

    // 只有在不带过滤条件的情况下才更新缓存
    if (!options) {
      promptsCache = errorResult;
      lastPromptsFetchTime = now;
    }

    return errorResult;
  }
};

// 获取单个Prompt
export const fetchPrompt = cache(async (id: string) => {
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
    const { data, error } = await readPrompt({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        prompt_id: id,
      },
    });

    if (error) {
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    return data;
  } catch (error) {
    console.error("获取prompt详情出错:", error);
    return { error: "获取数据失败" };
  }
});

// 获取所有Tags
export const fetchTags = cache(async (): Promise<FetchTagsReturn> => {
  const now = Date.now();
  const requestId = `fetchTags-${Math.random().toString(36).substring(7)}`;

  console.log(`[${requestId}] fetchTags 开始执行...`);

  // 验证用户认证状态
  const user = await requireAuth();
  if (!user) {
    console.log(`[${requestId}] 用户未认证，重定向到登录页`);
    redirect("/login");
  }

  // 使用缓存如果在有效期内
  if (tagsCache && now - lastTagsFetchTime < CACHE_TTL) {
    console.log(
      `[${requestId}] 返回缓存的tags数据，缓存时间: ${new Date(lastTagsFetchTime).toISOString()}`,
    );
    return tagsCache;
  }

  // 获取 token
  const token = await getAuthToken();

  if (!token) {
    console.log(`[${requestId}] 未找到 token，重定向到登录页`);
    redirect("/login");
  }

  try {
    console.log(
      `[${requestId}] 获取tags数据，token: ${token.substring(0, 5)}...`,
    );

    const response = await readTags({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 检查响应是否为空或无效
    if (!response) {
      console.error(`[${requestId}] API 返回空响应`);
      const errorResult = { error: "服务器返回空响应" };
      tagsCache = errorResult;
      lastTagsFetchTime = now;
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
      tagsCache = errorResult;
      lastTagsFetchTime = now;
      return errorResult;
    }

    // 如果API返回的数据为空或无效，返回适当的错误信息
    if (!data) {
      console.warn(`[${requestId}] API 未返回数据`);
      const errorResult = { error: "API未返回数据", status: 404 };
      tagsCache = errorResult;
      lastTagsFetchTime = now;
      return errorResult;
    }

    // 处理数据
    let result: FetchTagsReturn;

    if (Array.isArray(data)) {
      result = data;
    } else if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      Array.isArray(data.data)
    ) {
      result = data.data;
    } else {
      console.warn(`[${requestId}] 意外的 API 响应格式:`, data);
      result = { error: "API返回了意外的数据格式", status: 400 };
    }

    // 更新缓存
    tagsCache = result;
    lastTagsFetchTime = now;

    console.log(
      `[${requestId}] fetchTags 执行完成，数据${Array.isArray(result) ? `长度: ${result.length}` : "是错误对象"}`,
    );
    return result;
  } catch (error) {
    console.error(`[${requestId}] 获取tags数据出错:`, error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const errorResult = { error: `获取数据失败: ${errorMessage}`, status: 500 };

    // 缓存错误也是一种防止重复请求的方式
    tagsCache = errorResult;
    lastTagsFetchTime = now;

    return errorResult;
  }
});

// 创建Prompt
export async function addPrompt(formData: FormData) {
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
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;
    const type = formData.get("type") as string;
    const visibility = formData.get("visibility") as string;
    const tagIdsValue = formData.get("tag_ids") as string;
    const tag_ids = tagIdsValue ? JSON.parse(tagIdsValue) : [];
    const inputVarsValue = formData.get("input_vars") as string;
    const input_vars = inputVarsValue ? JSON.parse(inputVarsValue) : [];

    const { data, error } = await createPrompt({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        name,
        description,
        content,
        type,
        visibility,
        tag_ids,
        input_vars,
      },
    });

    if (error) {
      console.error("创建prompt出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    promptsCache = null;
    lastPromptsFetchTime = 0;

    // 重新验证路径
    revalidatePath("/prompts");

    // 创建成功，重定向到prompt详情页
    if (data && "id" in data) {
      redirect(`/prompts/${data.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("创建prompt出错:", error);
    return { error: "创建prompt失败" };
  }
}

// 更新Prompt
export async function updatePromptAction(id: string, formData: FormData) {
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
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;
    const type = formData.get("type") as string;
    const visibility = formData.get("visibility") as string;
    const tagIdsValue = formData.get("tag_ids") as string;
    const tag_ids = tagIdsValue ? JSON.parse(tagIdsValue) : [];
    const inputVarsValue = formData.get("input_vars") as string;
    const input_vars = inputVarsValue ? JSON.parse(inputVarsValue) : [];
    const createVersionValue = formData.get("create_version");
    const create_version = createVersionValue === "true";

    const { data, error } = await updatePrompt({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        prompt_id: id,
      },
      query: {
        create_version,
      },
      body: {
        name,
        description,
        content,
        type,
        visibility,
        tag_ids,
        input_vars,
      },
    });

    if (error) {
      console.error("更新prompt出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    promptsCache = null;
    lastPromptsFetchTime = 0;

    // 重新验证路径
    revalidatePath(`/prompts/${id}`);
    revalidatePath("/prompts");

    return { success: true };
  } catch (error) {
    console.error("更新prompt出错:", error);
    return { error: "更新prompt失败" };
  }
}

// 删除Prompt
export async function removePrompt(id: string) {
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
    const { data, error } = await deletePrompt({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        prompt_id: id,
      },
    });

    if (error) {
      console.error("删除prompt出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    promptsCache = null;
    lastPromptsFetchTime = 0;

    // 重新验证路径
    revalidatePath("/prompts");

    return { success: true };
  } catch (error) {
    console.error("删除prompt出错:", error);
    return { error: "删除prompt失败" };
  }
}

// 获取Prompt版本历史
export const fetchPromptVersions = cache(async (id: string) => {
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
    const { data, error } = await readPromptVersions({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        prompt_id: id,
      },
    });

    if (error) {
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    return data;
  } catch (error) {
    console.error("获取prompt版本历史出错:", error);
    return { error: "获取数据失败" };
  }
});

// 复制Prompt
export async function duplicatePromptAction(id: string) {
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
    const { data, error } = await duplicatePrompt({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        prompt_id: id,
      },
    });

    if (error) {
      console.error("复制prompt出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    promptsCache = null;
    lastPromptsFetchTime = 0;

    // 重新验证路径
    revalidatePath("/prompts");

    // 复制成功，重定向到新prompt详情页
    if (data && "id" in data) {
      redirect(`/prompts/${data.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("复制prompt出错:", error);
    return { error: "复制prompt失败" };
  }
}

// 创建Tag
export async function addTag(formData: FormData) {
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
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;

    const { data, error } = await createTag({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        name,
        description,
        color,
      },
    });

    if (error) {
      console.error("创建tag出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    tagsCache = null;
    lastTagsFetchTime = 0;

    // 重新验证路径
    revalidatePath("/prompts/tags");

    return { success: true, data };
  } catch (error) {
    console.error("创建tag出错:", error);
    return { error: "创建tag失败" };
  }
}

// 更新Tag
export async function updateTagAction(id: string, formData: FormData) {
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
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const color = formData.get("color") as string;

    const { data, error } = await updateTag({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        tag_id: id,
      },
      body: {
        name,
        description,
        color,
      },
    });

    if (error) {
      console.error("更新tag出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    tagsCache = null;
    lastTagsFetchTime = 0;

    // 重新验证路径
    revalidatePath("/prompts/tags");

    return { success: true };
  } catch (error) {
    console.error("更新tag出错:", error);
    return { error: "更新tag失败" };
  }
}

// 删除Tag
export async function removeTag(id: string) {
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
    const { data, error } = await deleteTag({
      headers: {
        Authorization: `Bearer ${token}`,
      },
      path: {
        tag_id: id,
      },
    });

    if (error) {
      console.error("删除tag出错:", error);
      return {
        error: typeof error === "string" ? error : JSON.stringify(error),
      };
    }

    // 清除缓存以便重新加载
    tagsCache = null;
    lastTagsFetchTime = 0;

    // 重新验证路径
    revalidatePath("/prompts/tags");

    return { success: true };
  } catch (error) {
    console.error("删除tag出错:", error);
    return { error: "删除tag失败" };
  }
}

// 导出类型
export type {
  PromptData,
  TagData,
  InputVariable,
  PromptVersionData,
  ApiErrorResponse,
};
