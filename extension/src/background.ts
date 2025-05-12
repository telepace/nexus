import type { PlasmoMessaging } from "@plasmohq/messaging"

// 声明 chrome API 类型
declare const chrome: {
  storage: {
    local: {
      get: (key: string | string[] | object, callback: (result: Record<string, any>) => void) => void
      set: (data: Record<string, any>, callback?: () => void) => void
    }
  },
  runtime: {
    onInstalled: {
      addListener: (callback: (details: { reason: string }) => void) => void
    }
  }
}

// 将 chrome API 转换为 Promise 接口
const chromeStorageLocal = {
  get: <T = any>(key: string): Promise<T> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] as T)
      })
    })
  },
  set: (key: string, value: any): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve()
      })
    })
  }
}

// 存储令牌的键名
const TOKEN_STORAGE_KEY = "auth_token"

// 监听来自内容脚本或弹出窗口的消息
export const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { type, data } = req.body

  console.log("后台脚本收到消息:", type, data)

  if (type === "get-auth-token") {
    // 从存储中获取认证令牌
    const token = await chromeStorageLocal.get<string>(TOKEN_STORAGE_KEY) || null
    res.send({
      success: true,
      data: { token }
    })
  } else if (type === "set-auth-token") {
    // 保存认证令牌到存储
    await chromeStorageLocal.set(TOKEN_STORAGE_KEY, data.token)
    res.send({
      success: true
    })
  } else if (type === "clear-auth-token") {
    // 清除认证令牌
    await chromeStorageLocal.set(TOKEN_STORAGE_KEY, null)
    res.send({
      success: true
    })
  } else if (type === "get-data") {
    // 示例：从存储中获取数据
    const nexusData = await chromeStorageLocal.get<Record<string, any>>("nexusData") || {}
    res.send({
      success: true,
      data: nexusData
    })
  } else if (type === "save-data") {
    // 示例：保存数据到存储
    await chromeStorageLocal.set("nexusData", data)
    res.send({
      success: true
    })
  } else {
    res.send({
      success: false,
      error: "未知消息类型"
    })
  }
}

// 插件初始化时的逻辑
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("Nexus Extension 已安装")
    // 初始化认证状态
    chromeStorageLocal.set(TOKEN_STORAGE_KEY, null)
  } else if (reason === "update") {
    console.log("Nexus Extension 已更新")
  }
}) 