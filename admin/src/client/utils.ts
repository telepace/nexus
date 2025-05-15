/**
 * 工具函数，用于处理API响应和错误提取
 */

/**
 * 检查一个值是否为API响应格式
 */
export const isApiResponse = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false
  }
  
  const obj = value as Record<string, unknown>
  // 检查是否包含API响应格式的关键字段
  return ('data' in obj || 'meta' in obj || 'error' in obj)
}

/**
 * 从API响应中提取错误信息
 */
export const extractApiResponseError = (response: unknown): string | null => {
  if (!isApiResponse(response)) {
    return null
  }
  
  const apiResponse = response as Record<string, unknown>
  
  // 直接返回error字段
  if (typeof apiResponse.error === 'string') {
    return apiResponse.error
  }
  
  // 尝试从meta中提取详细错误信息
  if (apiResponse.meta && typeof apiResponse.meta === 'object') {
    const meta = apiResponse.meta as Record<string, unknown>
    
    // 检查meta中是否有details字段
    if (meta.details) {
      if (Array.isArray(meta.details) && meta.details.length > 0) {
        const firstDetail = meta.details[0]
        if (typeof firstDetail === 'object' && firstDetail !== null) {
          // 尝试获取msg或message字段
          const detailObj = firstDetail as Record<string, unknown>
          if (typeof detailObj.msg === 'string') {
            return detailObj.msg
          }
          if (typeof detailObj.message === 'string') {
            return detailObj.message
          }
        }
        // 如果是字符串，直接返回
        if (typeof firstDetail === 'string') {
          return firstDetail
        }
      } else if (typeof meta.details === 'string') {
        return meta.details
      }
    }
  }
  
  return null
} 