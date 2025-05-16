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
  
  // 获取当前页面信息和用户设置
  useEffect(() => {
    const initialize = async () => {
      // 获取当前标签页信息
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tabs[0]) {
        setCurrentUrl(tabs[0].url || "")
        setCurrentTitle(tabs[0].title || "")
      }
      
      // 获取用户设置
      const storage = new Storage({ area: "local" })
      const userSettings = await storage.get("userSettings") as UserSettings
      setSettings(userSettings)
      
      // 获取最近剪藏
      try {
        const items = await getRecentClippings(3)
        setRecentItems(items)
      } catch (error) {
        console.error("获取剪藏失败:", error)
      }
    }
    
    initialize()
  }, [])
  
  // 一键剪藏
  const handleClip = async () => {
    setIsSaving(true)
    
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tabs[0]?.id) {
        // 提取页面内容
        const pageContent = await new Promise<string>((resolve) => {
          chrome.tabs.sendMessage(
            tabs[0].id, 
            { action: "getPageContent" }, 
            (response) => {
              resolve(response?.content || "")
            }
          )
        })
        
        // 如果无法通过内容脚本获取，则使用API提取
        const content = pageContent || await extractMainContent(document.documentElement.outerHTML)
        
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
          chrome.tabs.sendMessage(tabs[0].id, { action: "summarizePage" })
        }
        
        setTimeout(() => {
          setSaveSuccess(false)
        }, 2000)
      }
    } catch (error) {
      console.error("剪藏错误:", error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // 打开侧边栏并总结
  const handleSummarize = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "summarizePage" })
      window.close() // 关闭弹出窗口
    }
  }
  
  // 打开侧边栏并提取要点
  const handleExtractPoints = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: "processPage", 
        type: "highlights" 
      })
      window.close()
    }
  }
  
  // 打开侧边栏提问
  const handleAskAI = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "openAIChat" })
      window.close()
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
      {/* 主要行动区 */}
      <ClipButton
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        title={currentTitle}
        onClip={handleClip}
        onSummarize={handleSummarize}
      />
      
      {/* 次要行动区 */}
      <ActionButtons
        onSummarize={handleSummarize}
        onExtractPoints={handleExtractPoints}
        onAskAI={handleAskAI}
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