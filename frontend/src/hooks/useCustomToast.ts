"use client"

import { extractApiResponseError, isApiResponse } from "@/client"
import { toaster } from "@/components/ui/toaster"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toaster.create({
      title: "Success!",
      description,
      type: "success",
    })
  }

  const showErrorToast = (description: string | unknown) => {
    let errorMessage = "发生未知错误";
    
    // 处理各种错误类型
    if (typeof description === 'string') {
      errorMessage = description;
    } else if (description && isApiResponse(description)) {
      // 从API响应中提取错误信息
      const apiError = extractApiResponseError(description);
      if (apiError) {
        errorMessage = apiError;
      }
    } else if (description instanceof Error) {
      errorMessage = description.message || "发生错误";
    } else if (description && typeof description === 'object') {
      // 尝试从对象中提取错误信息
      const obj = description as any;
      if (obj.error) {
        errorMessage = obj.error;
      } else if (obj.message) {
        errorMessage = obj.message;
      } else if (obj.detail) {
        errorMessage = obj.detail;
      }
    }
    
    toaster.create({
      title: "出错了!",
      description: errorMessage,
      type: "error",
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
