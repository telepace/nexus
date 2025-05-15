import type { ApiError } from "./client"
import useCustomToast from "./hooks/useCustomToast"

export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: "Invalid email address",
}

export const namePattern = {
  value: /^[A-Za-z\s\u00C0-\u017F]{1,30}$/,
  message: "Invalid name",
}

export const passwordRules = (isRequired = true) => {
  const rules: any = {
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters",
    },
  }

  if (isRequired) {
    rules.required = "Password is required"
  }

  return rules
}

export const confirmPasswordRules = (
  getValues: () => any,
  isRequired = true,
) => {
  const rules: any = {
    validate: (value: string) => {
      const password = getValues().password || getValues().new_password
      return value === password ? true : "The passwords do not match"
    },
  }

  if (isRequired) {
    rules.required = "Password confirmation is required"
  }

  return rules
}

export const handleError = (err: ApiError) => {
  const { showErrorToast } = useCustomToast()

  // 优先使用message属性
  if (err.message) {
    showErrorToast(err.message)
    return
  }

  // 处理新的API响应格式
  if (typeof err.body === "object" && err.body !== null) {
    const responseBody = err.body as any

    // 检查是否是新的API响应格式
    if (responseBody.error) {
      // 直接使用error字段的内容作为错误消息
      showErrorToast(responseBody.error)
      return
    }

    // 兼容旧格式
    if (responseBody.detail) {
      const errDetail = responseBody.detail
      let errorMessage = errDetail
      if (Array.isArray(errDetail) && errDetail.length > 0) {
        errorMessage = errDetail[0].msg
      }
      showErrorToast(errorMessage)
      return
    }
  }

  // 默认错误处理
  showErrorToast("发生未知错误，请稍后重试")
}
