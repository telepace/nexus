import type { ApiRequestOptions } from "./ApiRequestOptions"
import type { ApiResult } from "./ApiResult"

export class ApiError extends Error {
  public readonly url: string
  public readonly status: number
  public readonly statusText: string
  public readonly body: unknown
  public readonly request: ApiRequestOptions
  public readonly errorMessage: string | null

  constructor(
    request: ApiRequestOptions,
    response: ApiResult,
    message: string,
  ) {
    // 检查是否为新的错误响应格式
    let errorMsg = message;
    
    if (response.body && typeof response.body === 'object') {
      const responseBody = response.body as any;
      
      // 如果响应包含error字段，则使用它作为错误消息
      if (responseBody.error) {
        errorMsg = responseBody.error;
      }
    }
    
    super(errorMsg);

    this.name = "ApiError"
    this.url = response.url
    this.status = response.status
    this.statusText = response.statusText
    this.body = response.body
    this.request = request
    this.errorMessage = errorMsg
  }
}
