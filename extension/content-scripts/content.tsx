import { Storage } from "@plasmohq/storage"
import { extractMainContent } from "~/utils/commons"
import type { ClippedItem } from "~/utils/interfaces"
import { saveClipping, getAIInsight } from "~/utils/api"

// 初始化边栏状态
let sidebarInjected = false
let sidebarVisible = false

// 创建边栏元素
const createSidebar = () => {
  if (sidebarInjected) return
  
  // 创建边栏容器
  const sidebarContainer = document.createElement("div")
  sidebarContainer.id = "nexus-sidebar"
  sidebarContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background-color: white;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
    z-index: 2147483647;
    transition: right 0.3s ease;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", sans-serif;
  `
  
  // 创建边栏头部
  const sidebarHeader = document.createElement("div")
  sidebarHeader.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #eee;
  `
  
  // 标题
  const title = document.createElement("h2")
  title.textContent = "Nexus"
  title.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  `
  
  // 关闭按钮
  const closeButton = document.createElement("button")
  closeButton.innerHTML = "✕"
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
  `
  closeButton.onclick = () => toggleSidebar(false)
  
  // 创建内容区域
  const contentArea = document.createElement("div")
  contentArea.id = "nexus-sidebar-content"
  contentArea.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  `
  
  // 组装边栏
  sidebarHeader.appendChild(title)
  sidebarHeader.appendChild(closeButton)
  sidebarContainer.appendChild(sidebarHeader)
  sidebarContainer.appendChild(contentArea)
  
  // 添加到页面
  document.body.appendChild(sidebarContainer)
  sidebarInjected = true
}

// 切换边栏显示状态
const toggleSidebar = (show: boolean) => {
  if (!sidebarInjected) createSidebar()
  
  const sidebar = document.getElementById("nexus-sidebar")
  if (sidebar) {
    sidebar.style.right = show ? "0" : "-400px"
    sidebarVisible = show
  }
}

// 更新边栏内容
const updateSidebarContent = (title: string, content: string) => {
  if (!sidebarInjected) createSidebar()
  
  const contentArea = document.getElementById("nexus-sidebar-content")
  if (contentArea) {
    contentArea.innerHTML = `
      <h3 style="margin-top: 0; font-size: 16px;">${title}</h3>
      <div>${content}</div>
    `
  }
  
  toggleSidebar(true)
}

// 显示加载中状态
const showLoadingState = (title: string) => {
  updateSidebarContent(title, `
    <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
      <div class="loading-dots">
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  `)
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
    })
    
    // 检查是否需要自动打开边栏进行总结
    const storage = new Storage({ area: "local" })
    const settings = await storage.get("userSettings")
    
    if (settings?.openSidebarOnClip) {
      handleSummarizePage()
    }
    
    return result
  } catch (error) {
    console.error("保存页面错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "保存失败，请稍后重试",
      type: "error"
    })
  }
}

// 处理页面总结
const handleSummarizePage = async () => {
  try {
    showLoadingState("页面总结")
    
    const pageContent = extractMainContent(document.documentElement.outerHTML)
    const response = await getAIInsight("summary", pageContent)
    
    updateSidebarContent("页面总结", `
      <div style="line-height: 1.5; white-space: pre-line;">${response.content}</div>
      <div style="margin-top: 16px;">
        <button id="nexus-save-summary" style="padding: 8px 16px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">保存总结</button>
      </div>
    `)
    
    // 添加保存按钮事件
    setTimeout(() => {
      const saveButton = document.getElementById("nexus-save-summary")
      if (saveButton) {
        saveButton.addEventListener("click", () => {
          handleSaveAIInsight(response.content, "summary")
        })
      }
    }, 0)
    
    return response
  } catch (error) {
    console.error("总结页面错误:", error)
    updateSidebarContent("页面总结", `
      <div>无法生成总结，请稍后重试。</div>
      <div style="color: red; margin-top: 8px; font-size: 14px;">${error.message}</div>
    `)
  }
}

// 处理选中内容
const handleProcessSelection = async (
  text: string, 
  type: "summary" | "explanation" | "translation"
) => {
  try {
    if (!text || text.trim().length < 10) {
      alert("选中的文本太短，无法处理。")
      return
    }
    
    // 显示加载状态
    const typeMap = {
      summary: "总结",
      explanation: "解释", 
      translation: "翻译"
    }
    
    showLoadingState(`正在${typeMap[type]}选中内容`)
    
    // 获取AI结果
    const response = await getAIInsight(type, text)
    
    // 更新边栏内容
    updateSidebarContent(`${typeMap[type]}结果`, `
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px; font-size: 14px;">
        <strong>原文：</strong><br>
        ${text.length > 300 ? text.substring(0, 300) + "..." : text}
      </div>
      <div style="line-height: 1.5; white-space: pre-line;">${response.content}</div>
      <div style="margin-top: 16px;">
        <button id="nexus-save-insight" style="padding: 8px 16px; background: #4285F4; color: white; border: none; border-radius: 4px; cursor: pointer;">保存结果</button>
      </div>
    `)
    
    // 添加保存按钮事件
    setTimeout(() => {
      const saveButton = document.getElementById("nexus-save-insight")
      if (saveButton) {
        saveButton.addEventListener("click", () => {
          handleSaveAIInsight(response.content, type, text)
        })
      }
    }, 0)
    
    return response
  } catch (error) {
    console.error(`处理选中内容错误 (${type}):`, error)
    updateSidebarContent(`${type === "summary" ? "总结" : type === "explanation" ? "解释" : "翻译"}结果`, `
      <div>处理失败，请稍后重试。</div>
      <div style="color: red; margin-top: 8px; font-size: 14px;">${error.message}</div>
    `)
  }
}

// 保存选中内容
const handleSaveSelection = async (text: string) => {
  try {
    if (!text || text.trim().length < 10) {
      alert("选中的文本太短，无法保存。")
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
    })
    
    return result
  } catch (error) {
    console.error("保存选中内容错误:", error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "保存失败，请稍后重试",
      type: "error"
    })
  }
}

// 保存AI分析结果
const handleSaveAIInsight = async (
  content: string, 
  type: "summary" | "explanation" | "translation",
  sourceText?: string
) => {
  try {
    const typeMap = {
      summary: "总结",
      explanation: "解释", 
      translation: "翻译"
    }
    
    const clipping: Omit<ClippedItem, "id"> = {
      title: `${document.title} 的${typeMap[type]}`,
      content: sourceText 
        ? `原文：\n${sourceText}\n\n${typeMap[type]}：\n${content}`
        : content,
      url: window.location.href,
      timestamp: Date.now(),
      status: "unread",
      aiProcessed: true
    }
    
    const result = await saveClipping(clipping)
    
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: `已保存${typeMap[type]}结果`
    })
    
    // 更新保存按钮文本
    const saveButton = document.getElementById("nexus-save-insight") || document.getElementById("nexus-save-summary")
    if (saveButton) {
      saveButton.textContent = "已保存!"
      saveButton.style.background = "#4CAF50"
      saveButton.disabled = true
    }
    
    return result
  } catch (error) {
    console.error(`保存${type}结果错误:`, error)
    chrome.runtime.sendMessage({ 
      action: "show_notification", 
      message: "保存失败，请稍后重试",
      type: "error"
    })
  }
}

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "clipPage":
      handleClipPage()
      break
      
    case "summarizePage":
      handleSummarizePage()
      break
      
    case "processSelection":
      handleProcessSelection(request.text, request.type)
      break
      
    case "saveSelection":
      handleSaveSelection(request.text)
      break
      
    case "toggleSidebar":
      toggleSidebar(request.show)
      break
  }
  
  return true
}) 