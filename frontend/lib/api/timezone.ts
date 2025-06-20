/**
 * 前端时区API处理工具
 *
 * 功能：
 * 1. 在API请求中自动添加时区信息
 * 2. 处理服务器返回的时区感知响应
 * 3. 提供时区相关的API配置
 */

import { getBrowserTimeZone } from "../date";

export interface TimezoneAwareResponse {
  utc: string;
  timestamp: number;
  local?: string;
  timezone?: string;
}

type ResponseData = Record<string, unknown>;
type APIFunction = (...args: unknown[]) => Promise<unknown>;

export class TimezoneApiClient {
  private userTimezone: string;

  constructor(timezone?: string) {
    this.userTimezone = timezone || getBrowserTimeZone();
  }

  /**
   * 获取带时区信息的请求头
   */
  getTimezoneHeaders(): Record<string, string> {
    return {
      "X-User-Timezone": this.userTimezone,
    };
  }

  /**
   * 更新用户时区
   */
  setTimezone(timezone: string): void {
    this.userTimezone = timezone;
  }

  /**
   * 获取当前用户时区
   */
  getTimezone(): string {
    return this.userTimezone;
  }

  /**
   * 处理时区感知的API响应
   * 将服务器返回的时间对象转换为本地Date对象
   */
  parseTimezoneResponse(response: TimezoneAwareResponse): Date {
    // 优先使用本地时间，如果没有则使用UTC时间
    const timeString = response.local || response.utc;
    return new Date(timeString);
  }

  /**
   * 递归处理响应数据中的时间字段
   */
  processResponseData(data: unknown): unknown {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.processResponseData(item));
    }

    if (typeof data === "object" && data !== null) {
      const processed = { ...data } as ResponseData;

      for (const [key, value] of Object.entries(processed)) {
        // 检查是否是时区感知的时间对象
        if (this.isTimezoneAwareResponse(value)) {
          processed[key] = this.parseTimezoneResponse(
            value as TimezoneAwareResponse,
          );
        } else if (typeof value === "object") {
          processed[key] = this.processResponseData(value);
        }
      }

      return processed;
    }

    return data;
  }

  /**
   * 检查是否是时区感知的响应对象
   */
  private isTimezoneAwareResponse(obj: unknown): boolean {
    return (
      obj &&
      typeof obj === "object" &&
      obj !== null &&
      "utc" in obj &&
      "timestamp" in obj &&
      typeof (obj as TimezoneAwareResponse).utc === "string" &&
      typeof (obj as TimezoneAwareResponse).timestamp === "number"
    );
  }
}

// 全局时区API客户端实例
let timezoneApiClient: TimezoneApiClient | null = null;

/**
 * 获取全局时区API客户端实例
 */
export function getTimezoneApiClient(): TimezoneApiClient {
  if (!timezoneApiClient) {
    timezoneApiClient = new TimezoneApiClient();
  }
  return timezoneApiClient;
}

/**
 * 更新全局时区设置
 */
export function updateGlobalTimezone(timezone: string): void {
  const client = getTimezoneApiClient();
  client.setTimezone(timezone);
}

/**
 * 获取当前全局时区设置
 */
export function getCurrentTimezone(): string {
  const client = getTimezoneApiClient();
  return client.getTimezone();
}

/**
 * API请求装饰器函数
 * 自动在请求中添加时区信息
 */
export function withTimezone<T extends APIFunction>(apiFunction: T): T {
  return (async (...args: unknown[]) => {
    const client = getTimezoneApiClient();
    const headers = client.getTimezoneHeaders();

    // 如果最后一个参数是配置对象，添加时区头
    const lastArg = args[args.length - 1];
    if (
      lastArg &&
      typeof lastArg === "object" &&
      lastArg !== null &&
      "headers" in lastArg
    ) {
      const configObject = lastArg as ResponseData;
      const existingHeaders = configObject.headers;
      configObject.headers = {
        ...(existingHeaders && typeof existingHeaders === "object"
          ? existingHeaders
          : {}),
        ...headers,
      };
    } else if (lastArg && typeof lastArg === "object" && lastArg !== null) {
      (lastArg as ResponseData).headers = headers;
    } else {
      args.push({ headers });
    }

    const response = await apiFunction(...args);

    // 处理响应数据中的时间字段
    if (response && typeof response === "object") {
      return client.processResponseData(response);
    }

    return response;
  }) as T;
}

/**
 * 时区感知的fetch包装函数
 */
export async function timezoneAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const client = getTimezoneApiClient();
  const headers = client.getTimezoneHeaders();

  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...init?.headers,
      ...headers,
    },
  };

  return fetch(input, mergedInit);
}

/**
 * 时区感知的axios拦截器配置
 */
export const timezoneAxiosConfig = {
  // 请求拦截器
  requestInterceptor: (config: ResponseData) => {
    const client = getTimezoneApiClient();
    const headers = client.getTimezoneHeaders();

    const existingHeaders = config.headers;
    config.headers = {
      ...(existingHeaders && typeof existingHeaders === "object"
        ? existingHeaders
        : {}),
      ...headers,
    };

    return config;
  },

  // 响应拦截器
  responseInterceptor: (response: ResponseData) => {
    const client = getTimezoneApiClient();

    if (response.data) {
      response.data = client.processResponseData(response.data);
    }

    return response;
  },
};
