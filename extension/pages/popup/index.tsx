import React, { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import type { ClippedItem, UserSettings } from "~/utils/interfaces"
import { getRecentClippings } from "~/utils/api"
import { extractMainContent } from "~/utils/commons"
import { saveClipping } from "~/utils/api"
import { getFrontendUrl } from "~/utils/config"

import ClipButton from "~/components/Popup/ClipButton"
import ActionButtons from "~/components/Popup/ActionButtons"
import RecentItems from "~/components/Popup/RecentItems"

const PopupApp = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [recentItems, setRecentItems] = useState<ClippedItem[]>([])
  const [currentUrl, setCurrentUrl] = useState("")
  const [currentTitle, setCurrentTitle] = useState("")
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  
  // 检查当前标签页是否可以访问
  const canAccessCurrentPage = (url: string): boolean => {
    const protectedSchemes = ["chrome:", "chrome-extension:", "about:"];
    return !protectedSchemes.some(scheme => url.startsWith(scheme));
  }
  
  // 获取当前页面信息和用户设置
  useEffect(() => {
    const initialize = async () => {
      try {
        // 获取当前标签页信息
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tabs[0]) {
          const url = tabs[0].url || "";
          setCurrentUrl(url);
          setCurrentTitle(tabs[0].title || "");
          setCurrentTabId(tabs[0].id || null);
          
          if (!canAccessCurrentPage(url)) {
            setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。");
          }
        }
        
        // 获取用户设置
        const storage = new Storage({ area: "local" })
        const userSettings = await storage.get("userSettings") as UserSettings
        setSettings(userSettings || {
          theme: 'system',
          defaultClipAction: 'save',
          openSidebarOnClip: false,
          autoSummarize: false,
          defaultLanguage: 'zh',
          showBadgeCounter: true
        })
        
        // 获取最近剪藏
        try {
          const items = await getRecentClippings(3)
          setRecentItems(items)
        } catch (error) {
          console.error("获取剪藏失败:", error)
          // 不要因为这个而阻止主要功能
        }
      } catch (err) {
        console.error("初始化错误:", err)
        setError("初始化失败，请重新打开扩展。")
      }
    }
    
    initialize()
  }, [])
  
  // 安全地发送消息到内容脚本
  const safelySendMessage = async (message: any): Promise<any> => {
    if (!currentTabId) {
      throw new Error("当前标签页ID未知")
    }
    
    return new Promise((resolve, reject) => {
      try {
        // 设置超时
        const timeoutId = setTimeout(() => {
          reject(new Error("消息发送超时"))
        }, 5000)
        
        chrome.tabs.sendMessage(
          currentTabId, 
          message, 
          (response) => {
            clearTimeout(timeoutId)
            
            if (chrome.runtime.lastError) {
              console.warn("发送消息错误:", chrome.runtime.lastError)
              // 尝试执行备用方法 - 通过content script直接调用
              tryContentScriptFallback(message, resolve, reject)
              return
            }
            
            resolve(response)
          }
        )
      } catch (error) {
        console.error("发送消息异常:", error)
        reject(error)
      }
    })
  }
  
  // 尝试通过注入一个内容脚本来执行操作（备用方案）
  const tryContentScriptFallback = async (message: any, resolve: Function, reject: Function) => {
    if (!currentTabId) return reject(new Error("当前标签页ID未知"))
    
    try {
      console.log("尝试备用方案 - 执行内容脚本")
      
      // 注入一个临时脚本来执行操作
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: (action) => {
          // 检查是否已存在 nexus 对象
          if (window.__nexusSidebar) {
            console.log("发现 __nexusSidebar 对象，直接调用")
            
            switch (action) {
              case "summarizePage":
                window.__nexusSidebar.summarize()
                break
              case "processPage":
                window.__nexusSidebar.extractPoints()
                break
              case "openAIChat":
                window.__nexusSidebar.openAIChat()
                break
              case "toggleSidebar":
                window.__nexusSidebar.toggle(true)
                break
              default:
                // 尝试直接发布消息
                window.postMessage({
                  source: "nexus-extension-content",
                  action: action
                }, "*")
            }
            
            return { success: true, method: "direct" }
          } else if (window.__nexusTest) {
            console.log("发现 __nexusTest 对象，直接调用")
            
            switch (action) {
              case "summarizePage":
                window.__nexusTest.testSummarize()
                break
              case "processPage":
                window.__nexusTest.testExtractPoints()
                break
              case "openAIChat":
                window.__nexusTest.testAIChat()
                break
              case "toggleSidebar":
                window.__nexusTest.testSidebarToggle()
                break
              default:
                // 尝试使用消息
                window.postMessage({
                  source: "nexus-extension-content",
                  action: action
                }, "*")
            }
            
            return { success: true, method: "test" }
          } else {
            // 都不存在，直接发送消息
            window.postMessage({
              source: "nexus-extension-content",
              action: action
            }, "*")
            
            return { success: true, method: "postMessage" }
          }
        },
        args: [message.action]
      })
      
      resolve({ success: true, method: "fallback" })
    } catch (error) {
      console.error("备用方案失败:", error)
      reject(error)
    }
  }
  
  // 一键剪藏
  const handleClip = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      if (!currentTabId) {
        throw new Error("无法确定当前标签页")
      }
      
      try {
        // 提取页面内容
        let pageContent = ""
        
        try {
          const response = await safelySendMessage({ action: "getPageContent" })
          pageContent = response?.content || ""
        } catch (error) {
          console.warn("无法通过内容脚本获取页面内容:", error)
        }
        
        // 如果无法通过内容脚本获取，则使用备用方法
        const content = pageContent || "无法提取页面内容。"
        
        const clipping: Omit<ClippedItem, "id"> = {
          title: currentTitle,
          content,
          url: currentUrl,
          timestamp: Date.now(),
          status: "unread"
        }
        
        await saveClipping(clipping)
        setSaveSuccess(true)
        
        // 如果设置了自动打开侧边栏总结
        if (settings?.openSidebarOnClip) {
          try {
            await safelySendMessage({ action: "summarizePage" })
          } catch (error) {
            console.warn("打开侧边栏总结失败:", error)
          }
        }
        
        setTimeout(() => {
          setSaveSuccess(false)
        }, 2000)
      } catch (err) {
        console.error("内容处理错误:", err)
        setError("内容处理失败")
      }
    } catch (err) {
      console.error("剪藏错误:", err)
      setError("剪藏失败，请重试")
    } finally {
      setIsSaving(false)
    }
  }
  
  // 打开侧边栏并总结
  const handleSummarize = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    try {
      await safelySendMessage({ action: "summarizePage" })
      window.close() // 关闭弹出窗口
    } catch (err) {
      console.error("总结错误:", err)
      setError("总结功能暂时不可用，请刷新页面后重试")
    }
  }
  
  // 打开侧边栏并提取要点
  const handleExtractPoints = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    try {
      await safelySendMessage({ 
        action: "processPage", 
        type: "highlights" 
      })
      window.close()
    } catch (err) {
      console.error("提取要点错误:", err)
      setError("提取要点功能暂时不可用，请刷新页面后重试")
    }
  }
  
  // 打开侧边栏提问
  const handleAskAI = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    try {
      await safelySendMessage({ action: "openAIChat" })
      window.close()
    } catch (err) {
      console.error("AI对话错误:", err)
      setError("AI对话功能暂时不可用，请刷新页面后重试")
    }
  }
  
  // 打开设置页面
  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }
  
  // 打开主应用
  const openMainApp = () => {
    chrome.tabs.create({ url: getFrontendUrl() })
  }
  
  // 查看剪藏项
  const viewClipping = (item: ClippedItem) => {
    chrome.tabs.create({ url: getFrontendUrl(`/items/${item.id}`) })
  }
  
  // 尝试重新激活扩展
  const handleRetry = async () => {
    setError(null)
    
    try {
      if (!currentTabId || !canAccessCurrentPage(currentUrl)) {
        throw new Error("无法访问当前页面")
      }
      
      // 尝试重新注入内容脚本
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        func: () => {
          // 清除可能的错误状态
          if (window.__nexusSidebar) {
            // 重置侧边栏
            if (typeof window.__nexusSidebar.create === 'function') {
              window.__nexusSidebar.create()
            }
          }
          
          // 通知页面重新加载扩展
          window.postMessage({
            source: "nexus-extension-content",
            action: "reinitialize"
          }, "*")
          
          return { success: true }
        }
      })
      
      // 直接尝试最基本的功能 - 显示侧边栏
      await safelySendMessage({ 
        action: "toggleSidebar",
        show: true 
      })
      
    } catch (err) {
      console.error("重试错误:", err)
      setError("无法重新激活扩展，请刷新页面后重试")
    }
  }
  
  return (
    <div className="w-80 p-4 bg-background text-foreground">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded text-sm">
          {error}
          <button 
            onClick={handleRetry}
            className="ml-2 text-xs bg-red-200 hover:bg-red-300 px-2 py-1 rounded"
          >
            重试
          </button>
        </div>
      )}
      
      {/* 主要行动区 */}
      <ClipButton
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        title={currentTitle}
        onClip={handleClip}
        onSummarize={handleSummarize}
        disabled={!canAccessCurrentPage(currentUrl)}
      />
      
      {/* AI 功能区域 */}
      <ActionButtons
        onSummarize={handleSummarize}
        onExtractPoints={handleExtractPoints}
        onAskAI={handleAskAI}
        disabled={!canAccessCurrentPage(currentUrl)}
      />
      
      {/* 最近项目 */}
      {recentItems.length > 0 && (
        <RecentItems items={recentItems} onItemClick={viewClipping} />
      )}
      
      {/* 页脚操作 */}
      <div className="flex justify-between mt-4 pt-2 border-t border-gray-200">
        <button
          onClick={openSettings}
          className="text-xs text-gray-600 hover:text-gray-900"
        >
          设置
        </button>
        
        <button
          onClick={openMainApp}
          className="text-xs text-primary hover:text-primary-dark"
        >
          打开主应用
        </button>
      </div>
    </div>
  )
}

export default PopupApp 