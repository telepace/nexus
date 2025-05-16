import React, { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import type { ClippedItem, UserSettings } from "~/utils/interfaces"
import { getRecentClippings } from "~/utils/api"
import { extractMainContent } from "~/utils/commons"
import { saveClipping } from "~/utils/api"

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
        }
      } catch (err) {
        console.error("初始化错误:", err)
        setError("初始化失败，请重新打开扩展。")
      }
    }
    
    initialize()
  }, [])
  
  // 一键剪藏
  const handleClip = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tabs[0]?.id) {
        try {
          // 提取页面内容
          const pageContent = await new Promise<string>((resolve, reject) => {
            try {
              chrome.tabs.sendMessage(
                tabs[0].id, 
                { action: "getPageContent" }, 
                (response) => {
                  // 检查错误
                  if (chrome.runtime.lastError) {
                    console.warn("发送消息错误:", chrome.runtime.lastError)
                    resolve("")
                    return
                  }
                  resolve(response?.content || "")
                }
              )
            } catch (error) {
              console.error("发送消息异常:", error)
              resolve("")
            }
          })
          
          // 如果无法通过内容脚本获取，则使用API提取
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
              chrome.tabs.sendMessage(tabs[0].id, { action: "summarizePage" })
            } catch (e) {
              console.warn("发送summarizePage消息失败:", e)
            }
          }
          
          setTimeout(() => {
            setSaveSuccess(false)
          }, 2000)
        } catch (err) {
          console.error("内容处理错误:", err)
          setError("内容处理失败")
        }
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
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "summarizePage" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("发送summarizePage消息失败:", chrome.runtime.lastError)
          }
        })
        window.close() // 关闭弹出窗口
      }
    } catch (err) {
      console.error("总结错误:", err)
      setError("总结功能暂时不可用")
    }
  }
  
  // 打开侧边栏并提取要点
  const handleExtractPoints = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: "processPage", 
          type: "highlights" 
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("发送processPage消息失败:", chrome.runtime.lastError)
          }
        })
        window.close()
      }
    } catch (err) {
      console.error("提取要点错误:", err)
      setError("提取要点功能暂时不可用")
    }
  }
  
  // 打开侧边栏提问
  const handleAskAI = async () => {
    if (!canAccessCurrentPage(currentUrl)) {
      setError("无法在此页面使用扩展。请访问正常网页使用扩展功能。")
      return
    }
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "openAIChat" }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("发送openAIChat消息失败:", chrome.runtime.lastError)
          }
        })
        window.close()
      }
    } catch (err) {
      console.error("AI对话错误:", err)
      setError("AI对话功能暂时不可用")
    }
  }
  
  // 打开设置页面
  const openSettings = () => {
    chrome.runtime.openOptionsPage()
  }
  
  // 打开主应用
  const openMainApp = () => {
    chrome.tabs.create({ url: "https://app.nexus.com" })
  }
  
  // 查看剪藏项
  const viewClipping = (item: ClippedItem) => {
    chrome.tabs.create({ url: `https://app.nexus.com/items/${item.id}` })
  }
  
  return (
    <div className="w-80 p-4 bg-background text-foreground">
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded text-sm">
          {error}
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
      
      {/* 次要行动区 */}
      <ActionButtons
        onSummarize={handleSummarize}
        onExtractPoints={handleExtractPoints}
        onAskAI={handleAskAI}
        disabled={!canAccessCurrentPage(currentUrl)}
      />
      
      {/* 状态与快速访问区 */}
      <RecentItems
        items={recentItems}
        onViewItem={viewClipping}
        onViewAll={openMainApp}
        onOpenSettings={openSettings}
      />
    </div>
  )
}

export default PopupApp 