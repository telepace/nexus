/**
 * 标准API响应格式
 */
export interface ApiResponseType<T> {
  /** 响应数据 */
  data: T | null;
  /** 元数据信息 */
  meta: Record<string, any> | null;
  /** 错误信息（仅在出错时存在） */
  error: string | null;
}

/**
 * 检查是否为标准API响应格式
 * @param response 要检查的响应数据
 * @returns 是否符合标准API响应格式
 */
export function isApiResponse(response: any): response is ApiResponseType<unknown> {
  return (
    response !== null &&
    typeof response === 'object' &&
    ('data' in response || 'error' in response) &&
    ('meta' in response || 'error' in response)
  );
}

/**
 * 提取API响应中的数据
 * @param response API响应或普通数据
 * @returns 如果是API响应则返回其data字段，否则返回原始数据
 */
export function extractApiResponseData<T>(response: ApiResponseType<T> | T): T | null {
  if (isApiResponse(response)) {
    return response.data;
  }
  return response as T;
}

/**
 * 提取API响应中的错误信息
 * @param response API响应
 * @returns 错误信息，如果没有错误则返回null
 */
export function extractApiResponseError(response: any): string | null {
  if (isApiResponse(response) && response.error) {
    return response.error;
  }
  return null;
}

/**
 * 创建标准API响应对象
 * @param data 响应数据
 * @param meta 元数据
 * @param error 错误信息
 * @returns 标准API响应对象
 */
export function createApiResponse<T>(
  data: T | null = null,
  meta: Record<string, any> | null = null,
  error: string | null = null
): ApiResponseType<T> {
  return {
    data,
    meta,
    error
  };
} 