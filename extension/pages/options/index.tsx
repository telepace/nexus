import React, { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import type { UserSettings, UserProfile } from "~/utils/interfaces"
import { logout } from "~/utils/api"
import Button from "~/components/ui/button"
import { getFrontendUrl } from "~/utils/config"

const OptionsPage = () => {
  const [settings, setSettings] = useState<UserSettings>({
    theme: "system",
    defaultClipAction: "save",
    openSidebarOnClip: false,
    autoSummarize: false,
    defaultLanguage: "en",
    showBadgeCounter: true
  })
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // 获取设置和用户信息
  useEffect(() => {
    const loadData = async () => {
      const storage = new Storage({ area: "local" })
      
      try {
        const userSettings = await storage.get("userSettings") as UserSettings
        if (userSettings) {
          setSettings(userSettings)
        }
        
        const profile = await storage.get("userProfile") as UserProfile
        setUserProfile(profile)
      } catch (error) {
        console.error("加载设置失败:", error)
      }
    }
    
    loadData()
  }, [])
  
  // 保存设置
  const saveSettings = async () => {
    setIsSaving(true)
    
    try {
      const storage = new Storage({ area: "local" })
      await storage.set("userSettings", settings)
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
      
      // 同时更新徽章
      chrome.runtime.sendMessage({ action: "updateBadgeCount" })
    } catch (error) {
      console.error("保存设置失败:", error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // 处理设置更改
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement
      setSettings((prev) => ({
        ...prev,
        [name]: target.checked
      }))
    } else {
      setSettings((prev) => ({
        ...prev,
        [name]: value
      }))
    }
  }
  
  // 处理登出
  const handleLogout = async () => {
    try {
      await logout()
      setUserProfile(null)
    } catch (error) {
      console.error("登出失败:", error)
    }
  }
  
  // 处理登录
  const handleLogin = () => {
    chrome.tabs.create({ url: getFrontendUrl("/login") })
  }
  
  return (
    <div className="container max-w-2xl mx-auto p-6 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-6">Nexus 扩展设置</h1>
      
      {/* 账户设置 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">账户</h2>
        
        {userProfile?.isAuthenticated ? (
          <div>
            <div className="flex items-center mb-4">
              {userProfile.avatar && (
                <img 
                  src={userProfile.avatar} 
                  alt="头像" 
                  className="w-10 h-10 rounded-full mr-3" 
                />
              )}
              <div>
                <div className="font-medium">{userProfile.name}</div>
                <div className="text-sm text-muted-foreground">{userProfile.email}</div>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
            >
              登出
            </Button>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-muted-foreground">
              登录 Nexus 账户以同步您的剪藏和设置。
            </p>
            <Button onClick={handleLogin}>登录</Button>
          </div>
        )}
      </div>
      
      {/* 通用设置 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">通用设置</h2>
        
        {/* 主题 */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">主题</label>
          <select
            name="theme"
            value={settings.theme}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="light">亮色</option>
            <option value="dark">暗色</option>
            <option value="system">跟随系统</option>
          </select>
        </div>
        
        {/* 默认语言 */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">默认语言</label>
          <select
            name="defaultLanguage"
            value={settings.defaultLanguage}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
        </div>
        
        {/* 显示徽章计数器 */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="showBadgeCounter"
            name="showBadgeCounter"
            checked={settings.showBadgeCounter}
            onChange={handleChange}
            className="mr-2"
          />
          <label htmlFor="showBadgeCounter">
            显示徽章计数器 (显示待处理项数量)
          </label>
        </div>
      </div>
      
      {/* 剪藏设置 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">剪藏设置</h2>
        
        {/* 默认剪藏行为 */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">默认剪藏行为</label>
          <select
            name="defaultClipAction"
            value={settings.defaultClipAction}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          >
            <option value="save">仅保存</option>
            <option value="save-and-summarize">保存并总结</option>
            <option value="save-and-highlight">保存并高亮关键点</option>
          </select>
        </div>
        
        {/* 剪藏时自动打开侧边栏 */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="openSidebarOnClip"
            name="openSidebarOnClip"
            checked={settings.openSidebarOnClip}
            onChange={handleChange}
            className="mr-2"
          />
          <label htmlFor="openSidebarOnClip">
            剪藏时自动打开侧边栏总结
          </label>
        </div>
        
        {/* 自动总结 */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="autoSummarize"
            name="autoSummarize"
            checked={settings.autoSummarize}
            onChange={handleChange}
            className="mr-2"
          />
          <label htmlFor="autoSummarize">
            自动为剪藏的内容生成摘要 (可能会增加API使用量)
          </label>
        </div>
      </div>
      
      {/* 快捷键说明 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">快捷键</h2>
        <p className="text-muted-foreground mb-2">
          您可以在浏览器的扩展管理页面设置以下快捷键:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
          <li>打开 Nexus 弹出窗口</li>
          <li>剪藏当前页面</li>
          <li>打开侧边栏总结当前页面</li>
        </ul>
      </div>
      
      {/* 保存按钮 */}
      <div className="flex items-center">
        <Button 
          onClick={saveSettings} 
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "保存设置"}
        </Button>
        
        {saveSuccess && (
          <span className="ml-3 text-green-600">已保存!</span>
        )}
      </div>
    </div>
  )
}

export default OptionsPage 