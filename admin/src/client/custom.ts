import { ApiError } from "./core/ApiError"
import type { ProjectPublic } from "./types.gen"

// 为了向后兼容，将ProjectPublic重新导出为ItemPublic
export type ItemPublic = ProjectPublic

/**
 * 检查是否为API响应对象
 */
export function isApiResponse(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/**
 * 从API响应中提取错误信息
 */
export function extractApiResponseError(response: unknown): string | null {
  if (!isApiResponse(response)) {
    return null
  }

  // 尝试从响应体中提取错误信息
  if (response.body && typeof response.body === "object") {
    const body = response.body as any

    // 常见的错误字段
    if (body.detail) {
      return typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail)
    }

    if (body.message) {
      return body.message
    }

    if (body.error) {
      return body.error
    }

    // 如果body是字符串
    if (typeof body === "string") {
      return body
    }
  }

  // 使用状态文本作为后备
  if (response.statusText) {
    return response.statusText
  }

  // 使用原始错误消息
  return response.message || "API请求失败"
}
