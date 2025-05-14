import { AuthJwtLoginError, RegisterRegisterError, HTTPValidationError } from "@/app/clientService";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(
  error: any,
): string {
  let errorMessage = "An unknown error occurred";

  if (typeof error === 'string') {
    return error;
  }

  // 处理验证错误
  if (error && typeof error === 'object') {
    if ('detail' in error) {
      if (typeof error.detail === "string") {
        // 如果detail是字符串，直接使用
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // 如果detail是数组（HTTPValidationError的情况）
        const firstError = error.detail[0];
        if (firstError && typeof firstError === 'object' && 'msg' in firstError) {
          errorMessage = firstError.msg;
        }
      } else if (typeof error.detail === "object" && error.detail && "reason" in error.detail) {
        // 如果detail是一个带reason的对象
        errorMessage = error.detail.reason;
      }
    } else if ('message' in error) {
      // 如果有message字段
      errorMessage = error.message;
    }
  }

  return errorMessage;
}
