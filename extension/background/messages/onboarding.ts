import { LOG_PREFIX, API_CONFIG } from "../../utils/config"

/**
 * 处理安装事件，安装后直接跳转到web setup页面
 * @param details 安装详情
 */
export function handleInstall(details: chrome.runtime.InstalledDetails): void {
  if (details.reason === "install") {
    console.log(`${LOG_PREFIX} 首次安装扩展，跳转到web setup页面`);
    // 构建回调URL，用于设置完成后重定向回来
    const callbackUrl = chrome.runtime.getURL("pages/oauth-callback.html");
    // 生成唯一的插件ID
    const pluginId = crypto.randomUUID();
    // 跳转到setup页面
    chrome.tabs.create({ 
      url: `${API_CONFIG.WEB_URL}/setup?plugin_id=${pluginId}&extension_callback=${encodeURIComponent(callbackUrl)}` 
    });
    
    // 存储pluginId用于后续验证
    chrome.storage.local.set({ "plugin_id": pluginId });
  }
}

// 监听安装事件
chrome.runtime.onInstalled.addListener(handleInstall);

/**
 * 处理来自引导页面的消息
 * @param message 消息对象
 * @param sender 发送方
 * @param sendResponse 响应回调
 */
export async function handler(
  message: { action?: string; type?: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  try {
    switch (message.type) {
      case "onboardingComplete":
        console.log(`${LOG_PREFIX} 用户完成了引导流程`);
        // 可以在这里记录用户完成了引导
        sendResponse({ success: true });
        break;
        
      default:
        console.log(`${LOG_PREFIX} 未知引导操作:`, message);
        sendResponse({ success: false, error: "未知操作" });
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} 处理引导消息错误:`, error);
    sendResponse({ success: false, error: String(error) });
  }
  
  return true;
} 