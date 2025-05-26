import { Storage } from "@plasmohq/storage"
import { extractMainContent } from "~/utils/commons"
import type { ClippedItem } from "~/utils/interfaces"
import { saveClipping, getAIInsight } from "~/utils/api"
import React from "react"
import { render } from "react-dom"
import { SidebarRoot } from "~/components/Sidebar"

// 初始化边栏状态
let sidebarInjected = false
let sidebarVisible = false
let sidebarContainer: HTMLDivElement | null = null
let reactRoot: HTMLDivElement | null = null
let injectionAttempts = 0
const MAX_INJECTION_ATTEMPTS = 3

// 确保侧边栏CSS样式在页面中
const injectGlobalStyles = () => {
  const styleId = "nexus-sidebar-styles"
  if (document.getElementById(styleId)) return

  try {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      #nexus-sidebar {
        position: fixed;
        top: 0;
        right: -400px;
        width: 400px;
        height: 100vh;
        z-index: 2147483647;
        transition: right 0.3s ease;
        box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
        background: white;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      
      #nexus-sidebar.visible {
        right: 0;
      }
      
      #nexus-sidebar-root {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      
      /* 添加动画效果 */
      @keyframes nexus-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      #nexus-sidebar {
        animation: nexus-fade-in 0.3s ease;
      }
    `
    document.head.appendChild(style)
    console.debug("[Nexus] 全局样式已注入")
  } catch (error) {
    console.error("[Nexus] 注入样式失败:", error)
  }
}

// 创建React侧边栏
const createReactSidebar = () => {
  if (sidebarInjected && sidebarContainer) {
    console.debug("[Nexus] 侧边栏已存在，无需重新创建")
    return
  }
  
  // 如果超过最大尝试次数，终止
  if (injectionAttempts >= MAX_INJECTION_ATTEMPTS) {
    console.error(`[Nexus] 创建侧边栏失败，已尝试 ${injectionAttempts} 次，放弃尝试`)
    return
  }
  
  injectionAttempts++
  console.debug(`[Nexus] 开始创建React侧边栏...（尝试 ${injectionAttempts}/${MAX_INJECTION_ATTEMPTS}）`)
  
  try {
    // 先确保样式存在
    injectGlobalStyles()
    
    // 检查侧边栏是否已存在
    sidebarContainer = document.getElementById("nexus-sidebar") as HTMLDivElement
    
    if (!sidebarContainer) {
      // 创建边栏容器
      sidebarContainer = document.createElement("div")
      sidebarContainer.id = "nexus-sidebar"
      
      // 创建React根节点
      reactRoot = document.createElement("div")
      reactRoot.id = "nexus-sidebar-root"
      
      sidebarContainer.appendChild(reactRoot)
      
      // 添加到页面
      document.body.appendChild(sidebarContainer)
    } else {
      // 如果已存在，但需要重置React根节点
      if (!document.getElementById("nexus-sidebar-root")) {
        reactRoot = document.createElement("div")
        reactRoot.id = "nexus-sidebar-root"
        sidebarContainer.appendChild(reactRoot)
      } else {
        reactRoot = document.getElementById("nexus-sidebar-root") as HTMLDivElement
      }
    }
    
    // 确保React根节点不为空
    if (reactRoot) {
      // 渲染React组件
      render(<SidebarRoot />, reactRoot)
      console.debug("[Nexus] React侧边栏已创建完成")
    } else {
      throw new Error("React根节点为空")
    }
    
    sidebarInjected = true
    injectionAttempts = 0 // 重置尝试次数
  } catch (error) {
    console.error("[Nexus] 创建侧边栏失败:", error)
    
    // 如果失败，在一秒后重试
    if (injectionAttempts < MAX_INJECTION_ATTEMPTS) {
      setTimeout(createReactSidebar, 1000)
    } else {
      // 如果多次失败，创建一个简单的纯DOM侧边栏作为备用
      createFallbackSidebar()
    }
  }
}

// 创建备用简单侧边栏
const createFallbackSidebar = () => {
  console.debug("[Nexus] 创建备用简单侧边栏...")
  
  try {
    // 先确保样式存在
    injectGlobalStyles()
    
    // 创建简单侧边栏
    const container = document.createElement("div")
    container.id = "nexus-sidebar"
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      z-index: 2147483647;
      background-color: white;
      box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
      transition: right 0.3s ease;
      padding: 20px;
      display: flex;
      flex-direction: column;
    `
    
    // 添加内容
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; font-size: 18px;">Nexus 助手</h2>
        <button id="nexus-sidebar-close" style="background: none; border: none; cursor: pointer; font-size: 20px;">&times;</button>
      </div>
      <div style="flex: 1; overflow-y: auto; padding: 10px 0;">
        <p>Nexus 侧边栏加载失败。</p>
        <p>请尝试刷新页面或重新安装扩展。</p>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 10px;">
        <button id="nexus-sidebar-reload" style="background: #4f46e5; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">重新加载</button>
      </div>
    `
    
    // 添加到页面
    document.body.appendChild(container)
    
    // 添加事件监听器
    document.getElementById("nexus-sidebar-close")?.addEventListener("click", () => {
      toggleSidebar(false)
    })
    
    document.getElementById("nexus-sidebar-reload")?.addEventListener("click", () => {
      container.remove()
      sidebarInjected = false
      injectionAttempts = 0
      setTimeout(createReactSidebar, 500)
    })
    
    sidebarContainer = container
    sidebarInjected = true
  } catch (error) {
    console.error("[Nexus] 创建备用侧边栏失败:", error)
  }
}

// 切换边栏显示状态
const toggleSidebar = (show: boolean) => {
  console.debug(`[Nexus] 切换侧边栏 ${show ? '显示' : '隐藏'}`)
  
  if (!sidebarInjected || !sidebarContainer) {
    createReactSidebar()
    // 等待创建完成后显示
    setTimeout(() => toggleSidebar(show), 100)
    return
  }
  
  try {
    if (show) {
      sidebarContainer.style.right = "0"
      sidebarContainer.classList.add("visible")
    } else {
      sidebarContainer.style.right = "-400px"
      sidebarContainer.classList.remove("visible")
    }
    
    sidebarVisible = show
    console.debug(`[Nexus] 侧边栏已${show ? '显示' : '隐藏'}`)
    
    // 通知状态变化
    window.postMessage({
      source: "nexus-extension-sidebar",
      action: "sidebarStateChanged",
      isVisible: show
    }, "*")
  } catch (error) {
    console.error("[Nexus] 切换侧边栏状态失败:", error)
    
    // 如果出错，尝试重新创建
    if (error.toString().includes("Cannot read properties of null")) {
      sidebarInjected = false
      createReactSidebar()
      // 等待创建完成后显示
      setTimeout(() => toggleSidebar(show), 300)
    }
  }
}

// 显示加载中状态
const showLoadingState = (title: string) => {
  console.debug(`[Nexus] 显示加载状态: ${title}`)
  
  if (!sidebarInjected || !sidebarContainer) {
    createReactSidebar()
  }
  
  // 确保侧边栏可见
  toggleSidebar(true)
  
  // 通知加载状态
  window.postMessage({
    source: "nexus-extension-sidebar",
    action: "showLoading",
    title
  }, "*")
}

// 处理页面剪藏
const handleClipPage = async () => {
  try {
    const pageContent = extractMainContent(document.documentElement.outerHTML)
    
    const clipping: Omit<ClippedItem, "id"> = {
      title: document.title,
      content: pageContent,
      url: window.location.href,
      timestamp: Date.now(),
      status: "unread"
    }
    
    const result = await saveClipping(clipping)
    
    // 显示成功消息
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "已保存到待看列表"
    }).catch(() => {/* 忽略错误 */})
    
    // 检查是否需要自动打开边栏进行总结
    const storage = new Storage({ area: "local" })
    const settings = await storage.get("userSettings")
    
    if (settings?.openSidebarOnClip) {
      handleSummarizePage()
    }
    
    return result
  } catch (error) {
    console.error("[Nexus] 保存页面错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "保存失败，请稍后重试",
      type: "error"
    }).catch(() => {/* 忽略错误 */})
  }
}

// 处理页面总结
const handleSummarizePage = async () => {
  try {
    console.debug("[Nexus] 开始页面总结...")
    showLoadingState("页面总结")
    
    // 确保侧边栏可见
    toggleSidebar(true)
    
    // 通知侧边栏执行总结操作
    window.postMessage({
      source: "nexus-extension-content",
      action: "executeSummary",
      content: extractMainContent(document.documentElement.outerHTML)
    }, "*")
    
    return true
  } catch (error) {
    console.error("[Nexus] 总结页面错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "总结失败，请稍后重试",
      type: "error"
    }).catch(() => {/* 忽略错误 */})
    
    // 仍然显示侧边栏，但通知错误状态
    window.postMessage({
      source: "nexus-extension-content",
      action: "operationFailed",
      operationType: "summary",
      error: error.toString()
    }, "*")
  }
}

// 处理提取要点
const handleExtractPoints = async () => {
  try {
    console.debug("[Nexus] 开始提取要点...")
    showLoadingState("提取要点")
    
    // 确保侧边栏可见
    toggleSidebar(true)
    
    // 通知侧边栏执行要点提取
    window.postMessage({
      source: "nexus-extension-content",
      action: "executeExtractPoints",
      content: extractMainContent(document.documentElement.outerHTML)
    }, "*")
    
    return true
  } catch (error) {
    console.error("[Nexus] 提取要点错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "提取要点失败，请稍后重试",
      type: "error"
    }).catch(() => {/* 忽略错误 */})
    
    // 仍然显示侧边栏，但通知错误状态
    window.postMessage({
      source: "nexus-extension-content",
      action: "operationFailed",
      operationType: "extractPoints",
      error: error.toString()
    }, "*")
  }
}

// 处理AI对话
const handleOpenAIChat = async () => {
  try {
    console.debug("[Nexus] 开始AI对话...")
    showLoadingState("AI对话")
    
    // 确保侧边栏可见
    toggleSidebar(true)
    
    // 通知侧边栏打开AI聊天
    window.postMessage({
      source: "nexus-extension-content",
      action: "openChat",
      pageContext: {
        title: document.title,
        url: window.location.href
      }
    }, "*")
    
    return true
  } catch (error) {
    console.error("[Nexus] AI对话错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "AI对话失败，请稍后重试",
      type: "error"
    }).catch(() => {/* 忽略错误 */})
    
    // 仍然显示侧边栏，但通知错误状态
    window.postMessage({
      source: "nexus-extension-content",
      action: "operationFailed",
      operationType: "aiChat",
      error: error.toString()
    }, "*")
  }
}

// 处理选中内容
const handleProcessSelection = async (
  text: string, 
  type: "summary" | "explanation" | "translation"
) => {
  try {
    if (!text || text.trim().length < 10) {
      chrome.runtime.sendMessage({ 
        action: "show_notification", 
        message: "选中的文本太短，无法处理",
        type: "warning"
      }).catch(() => {/* 忽略错误 */})
      return
    }
    
    // 显示加载状态
    const typeMap = {
      summary: "总结",
      explanation: "解释", 
      translation: "翻译"
    }
    
    console.debug(`[Nexus] 开始处理选中内容: ${typeMap[type]}`)
    showLoadingState(`正在${typeMap[type]}选中内容`)
    
    // 确保侧边栏可见
    toggleSidebar(true)
    
    // 通知侧边栏处理选中内容
    window.postMessage({
      source: "nexus-extension-content",
      action: "processSelection",
      text,
      type
    }, "*")
    
    return true
  } catch (error) {
    console.error(`[Nexus] 处理选中内容错误 (${type}):`, error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: `处理选中内容失败，请稍后重试`,
      type: "error"
    }).catch(() => {/* 忽略错误 */})
    
    // 仍然显示侧边栏，但通知错误状态
    window.postMessage({
      source: "nexus-extension-content",
      action: "operationFailed",
      operationType: "processSelection",
      error: error.toString()
    }, "*")
  }
}

// 保存选中内容
const handleSaveSelection = async (text: string) => {
  try {
    if (!text || text.trim().length < 10) {
      chrome.runtime.sendMessage({ 
        action: "show_notification", 
        message: "选中的文本太短，无法保存",
        type: "warning"
      }).catch(() => {/* 忽略错误 */})
      return
    }
    
    const clipping: Omit<ClippedItem, "id"> = {
      title: `从 ${document.title} 中选择的文本`,
      content: text,
      url: window.location.href,
      timestamp: Date.now(),
      status: "unread"
    }
    
    const result = await saveClipping(clipping)
    
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "已保存选中内容"
    }).catch(() => {/* 忽略错误 */})
    
    return result
  } catch (error) {
    console.error("[Nexus] 保存选中内容错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "保存失败，请稍后重试",
      type: "error"
    }).catch(() => {/* 忽略错误 */})
  }
}

// 获取页面内容
const getPageContent = () => {
  try {
    return {
      content: extractMainContent(document.documentElement.outerHTML)
    }
  } catch (error) {
    console.error("[Nexus] 获取页面内容失败:", error)
    return {
      content: document.body.innerText.substring(0, 5000) // 退回到简单文本提取
    }
  }
}

// 将函数暴露给全局范围，用于调试
window.__nexusSidebar = {
  toggle: toggleSidebar,
  create: createReactSidebar,
  summarize: handleSummarizePage,
  extractPoints: handleExtractPoints,
  openAIChat: handleOpenAIChat
}

// 监听来自外部内容脚本的消息
window.addEventListener("message", (event) => {
  // 确保消息来自我们的扩展
  if (event.data && event.data.source === "nexus-extension-content") {
    console.debug("[Nexus] content-scripts/content.tsx 接收到来自content.ts的消息:", event.data)
    
    // 处理不同的消息类型
    try {
      switch (event.data.action) {
        case "summarizePage":
          handleSummarizePage()
          break
        
        case "processPage":
          if (event.data.type === "highlights") {
            handleExtractPoints()
          }
          break
        
        case "openAIChat":
          handleOpenAIChat()
          break
        
        case "processSelection":
          handleProcessSelection(event.data.text, event.data.type)
          break
        
        case "saveSelection":
          handleSaveSelection(event.data.text)
          break
        
        case "toggleSidebar":
          toggleSidebar(event.data.show)
          break
      }
      
      // 发送响应回去
      window.postMessage({
        source: "nexus-extension-sidebar",
        action: `${event.data.action}_response`,
        success: true
      }, "*")
    } catch (error) {
      console.error("[Nexus] 处理消息错误:", error)
      
      // 仍然返回响应，但标记失败
      window.postMessage({
        source: "nexus-extension-sidebar",
        action: `${event.data.action}_response`,
        success: false,
        error: error.toString()
      }, "*")
    }
  }
})

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.debug("[Nexus] content-scripts/content.tsx 接收到来自chrome.runtime的消息:", request)
  
  try {
    switch (request.action) {
      case "clipPage":
        handleClipPage().then(result => sendResponse(result))
        break
        
      case "summarizePage":
        handleSummarizePage().then(result => sendResponse(result))
        break
        
      case "processPage":
        if (request.type === "highlights") {
          handleExtractPoints().then(result => sendResponse(result))
        }
        break
        
      case "openAIChat":
        handleOpenAIChat().then(result => sendResponse(result))
        break
        
      case "processSelection":
        handleProcessSelection(request.text, request.type).then(result => sendResponse(result))
        break
        
      case "saveSelection":
        handleSaveSelection(request.text).then(result => sendResponse(result))
        break
        
      case "toggleSidebar":
        toggleSidebar(request.show)
        sendResponse({ success: true })
        break
        
      case "getPageContent":
        sendResponse(getPageContent())
        break
    }
  } catch (error) {
    console.error("[Nexus] 处理chrome.runtime消息错误:", error)
    sendResponse({ error: error.toString() })
  }
  
  return true // 保持消息通道开放
})

// 页面加载完成后，确保初始化
document.addEventListener("DOMContentLoaded", () => {
  console.debug("[Nexus] content-scripts/content.tsx DOMContentLoaded")
  
  // 预创建侧边栏但不显示
  try {
    setTimeout(() => {
      createReactSidebar()
      console.debug("[Nexus] 侧边栏已预加载")
      
      // 通知初始化完成
      chrome.runtime.sendMessage({
        action: "sidebarInitialized"
      }).catch(() => {/* 忽略错误 */})
    }, 1000) // 延迟1秒创建，避免与页面加载冲突
  } catch (error) {
    console.error("[Nexus] 预加载侧边栏失败:", error)
  }
})

// 额外的安全措施 - MutationObserver 监听以防DOM被意外清空
const bodyObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
      // 检查是否我们的侧边栏被移除
      if (sidebarInjected && !document.getElementById("nexus-sidebar")) {
        console.debug("[Nexus] 侧边栏被移除，正在重新创建")
        sidebarInjected = false
        sidebarContainer = null
        reactRoot = null
        
        // 如果侧边栏是可见的，则需要重新创建并显示
        if (sidebarVisible) {
          setTimeout(() => {
            createReactSidebar()
            setTimeout(() => toggleSidebar(true), 300)
          }, 500)
        }
      }
    }
  }
})

// 开始监听body变化
try {
  if (document.body) {
    bodyObserver.observe(document.body, { childList: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      bodyObserver.observe(document.body, { childList: true });
    })
  }
} catch (error) {
  console.error("[Nexus] 设置DOM观察器失败:", error)
}

// 直接运行初始化代码（不依赖DOMContentLoaded，这是上面的备份机制）
try {
  // 如果文档已加载完成，直接执行
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(createReactSidebar, 1000)
  }
} catch (error) {
  console.error("[Nexus] 初始化失败:", error)
} 