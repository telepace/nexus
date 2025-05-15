import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ErrorWithDetail = {
  detail?: string | { reason: string } | Array<{ msg: string }>;
  message?: string;
};

export function getErrorMessage(
  error: unknown,
): string {
  let errorMessage = "An unknown error occurred";

  if (typeof error === 'string') {
    return error;
  }

  // 处理验证错误
  if (error && typeof error === 'object') {
    const typedError = error as ErrorWithDetail;
    
    if ('detail' in typedError) {
      if (typeof typedError.detail === "string") {
        // 如果detail是字符串，直接使用
        errorMessage = typedError.detail;
      } else if (Array.isArray(typedError.detail)) {
        // 如果detail是数组（HTTPValidationError的情况）
        const firstError = typedError.detail[0];
        if (firstError && typeof firstError === 'object' && 'msg' in firstError) {
          errorMessage = firstError.msg;
        }
      } else if (typeof typedError.detail === "object" && typedError.detail && "reason" in typedError.detail) {
        // 如果detail是一个带reason的对象
        errorMessage = typedError.detail.reason;
      }
    } else if ('message' in typedError) {
      // 如果有message字段
      errorMessage = typedError.message ?? "Unknown error message";
    }
  }

  return errorMessage;
}
