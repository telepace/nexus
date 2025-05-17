import type { PlasmoCSConfig } from "plasmo"
import { Storage } from "@plasmohq/storage"

// 指定内容脚本配置
export const config: PlasmoCSConfig = {
  // 只匹配 http 和 https URL
  matches: ["http://*/*", "https://*/*"],
  all_frames: false,
  run_at: "document_idle"
}

// 导出默认函数
export default function() {
  console.debug("[Nexus] content.ts 已加载")
  
  // 创建用于与侧边栏组件通信的消息通道
  const setupSidebarConnection = () => {
    // 监听来自popup或扩展其他部分的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.debug("[Nexus] content.ts 收到消息:", request)
      
      // 处理所有类型的动作，不仅限于侧边栏
      // 将消息转发到content-scripts/content.tsx
      window.postMessage({
        source: "nexus-extension-content",
        ...request
      }, "*")
      
      // 如果消息需要立即响应，则返回成功
      if (request.action === "getPageContent") {
        // 尝试直接从页面提取内容
        try {
          const content = document.documentElement.outerHTML
          sendResponse({ content })
        } catch (error) {
          console.error("[Nexus] 提取页面内容出错:", error)
          sendResponse({ content: "" })
        }
      } else {
        // 对于其他类型的消息，我们返回成功但也继续传递
        sendResponse({ success: true })
      }
      
      return true // 保持消息通道开放
    })
    
    // 监听来自content-scripts/content.tsx的消息
    window.addEventListener("message", (event) => {
      // 确保消息源自我们的扩展
      if (event.data && event.data.source === "nexus-extension-sidebar") {
        console.debug("[Nexus] content.ts 收到来自侧边栏的消息:", event.data)
        
        // 如果需要，可以在这里处理从侧边栏返回的消息
        // 将消息转发给popup或背景脚本
        if (event.data.action && event.data.action.endsWith("_response")) {
          chrome.runtime.sendMessage(event.data)
        }
      }
    })
  }
  
  // 创建一个直接测试方法，可以通过控制台调用
  window.__nexusTest = {
    testSidebarToggle: () => {
      console.debug("[Nexus] 测试显示侧边栏")
      window.postMessage({
        source: "nexus-extension-content",
        action: "toggleSidebar",
        show: true
      }, "*")
    },
    testSummarize: () => {
      console.debug("[Nexus] 测试总结功能")
      window.postMessage({
        source: "nexus-extension-content",
        action: "summarizePage"
      }, "*")
    },
    testExtractPoints: () => {
      console.debug("[Nexus] 测试提取要点功能")
      window.postMessage({
        source: "nexus-extension-content",
        action: "processPage",
        type: "highlights"
      }, "*")
    },
    testAIChat: () => {
      console.debug("[Nexus] 测试AI对话功能") 
      window.postMessage({
        source: "nexus-extension-content",
        action: "openAIChat"
      }, "*")
    }
  }
  
  // 设置连接
  setupSidebarConnection()
  
  // 通知页面脚本已加载
  console.debug("[Nexus] 消息通道已建立")
} 