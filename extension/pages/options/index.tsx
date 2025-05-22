import React, { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import type { UserSettings, UserProfile } from "~/utils/interfaces"
import { logout } from "~/utils/api"
import Button from "~/components/ui/button"
import { getFrontendUrl } from "~/utils/config"
import { FaWeixin, FaFacebook, FaDiscord, FaComments } from "react-icons/fa"
import "./options.css"

// 社交媒体图标组件
const SocialMediaBar: React.FC = () => {
  const handleSocialClick = (platform: string) => {
    let url = ''
    
    switch (platform) {
      case 'wechat':
        // 这里可以替换为实际的WeChat链接或二维码弹窗
        alert('WeChat QR Code')
        return
      case 'facebook':
        url = 'https://facebook.com/nexusai'
        break
      case 'discord':
        url = 'https://discord.gg/nexusai'
        break
      case 'feedback':
        url = 'https://github.com/telepace/nexus/issues/new'
        break
    }
    
    if (url) {
      window.open(url, '_blank')
    }
  }
  
  return (
    <div className="social-media-bar">
      <button 
        className="social-button" 
        onClick={() => handleSocialClick('wechat')}
        title="WeChat"
      >
        <FaWeixin />
      </button>
      <button 
        className="social-button" 
        onClick={() => handleSocialClick('facebook')}
        title="Facebook"
      >
        <FaFacebook />
      </button>
      <button 
        className="social-button" 
        onClick={() => handleSocialClick('discord')}
        title="Discord"
      >
        <FaDiscord />
      </button>
      <button 
        className="social-button feedback-button" 
        onClick={() => handleSocialClick('feedback')}
        title="Feedback"
      >
        <FaComments />
        <span className="feedback-text">Feedback</span>
      </button>
    </div>
  )
}

const OptionsPage: React.FC = () => {
  // 状态定义
  const [settings, setSettings] = useState<UserSettings>({
    theme: "system",
    defaultClipAction: "save",
    openSidebarOnClip: false,
    autoSummarize: false,
    defaultLanguage: "en",
    showBadgeCounter: true,
    useBrowserLanguage: false,
    keepSidePanelOpen: false,
    promptShortcuts: [
      { shortcut: '/insight', prompt: 'Get insight from internet' },
      { shortcut: '/summarize', prompt: 'Summarize the context' },
      { shortcut: '/rephrase', prompt: 'Rephrase the sentence' },
      { shortcut: '/translate', prompt: 'Translate to local language' }
    ],
    keyboardShortcut: '⇧⌘E'
  })
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [activeSection, setActiveSection] = useState<string>("account")
  
  // 快捷提示相关状态
  const [newShortcut, setNewShortcut] = useState({ shortcut: "", prompt: "" })
  const [editingShortcutIndex, setEditingShortcutIndex] = useState<number | null>(null)
  const [isAddingShortcut, setIsAddingShortcut] = useState<boolean>(false)
  
  // AI模型相关状态
  const [availableModels, setAvailableModels] = useState([
    { id: "gpt-3.5", name: "GPT-3.5", free: true, selected: true },
    { id: "gpt-4", name: "GPT-4", free: false, selected: false },
    { id: "claude", name: "Claude", free: false, selected: false }
  ])
  
  // 加载设置和用户信息
  useEffect(() => {
    const loadData = async () => {
      const storage = new Storage({ area: "local" })
      
      try {
        const userSettings = await storage.get("userSettings") as UserSettings
        if (userSettings) {
          setSettings(userSettings)
        }
        
        const profile = await storage.get("userProfile") as UserProfile
        setUserProfile(profile || null)
        
        // 新增：尝试与Web端同步登录状态
        if (!profile?.isAuthenticated) {
          try {
            // 使用sendMessage向background脚本请求同步Web会话
            const response = await chrome.runtime.sendMessage({
              name: "auth",
              body: {
                action: "syncWebSession"
              }
            })
            
            if (response?.success) {
              // 同步成功，重新获取用户配置
              const updatedProfile = await storage.get("userProfile") as UserProfile
              if (updatedProfile) {
                setUserProfile(updatedProfile)
                console.log("[Nexus] 成功从Web端同步登录状态")
              }
            }
          } catch (error) {
            console.error("[Nexus] 同步Web登录状态失败:", error)
          }
        }
      } catch (error) {
        console.error("加载设置失败:", error)
      }
    }
    
    loadData()
  }, [])
  
  // 监听storage变化，实时刷新账户信息
  useEffect(() => {
    function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
      if (areaName === "local" && changes.userProfile) {
        setUserProfile(changes.userProfile.newValue || null)
      }
    }
    
    // 监听来自background的消息，包括登录状态变化
    function handleRuntimeMessage(message: any) {
      if (message.action === "updateUserStatus") {
        if (!message.data.isAuthenticated) {
          // 用户已登出
          setUserProfile(null)
        } else if (message.data.profile) {
          // 用户数据已更新
          setUserProfile(message.data.profile)
        }
      }
    }
    
    chrome.storage.onChanged.addListener(handleStorageChange)
    chrome.runtime.onMessage.addListener(handleRuntimeMessage)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage)
    }
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
  
  // 快捷提示相关函数
  const handleAddShortcut = () => {
    setIsAddingShortcut(true)
    setNewShortcut({ shortcut: "", prompt: "" })
  }
  
  const handleCancelAddShortcut = () => {
    setIsAddingShortcut(false)
    setEditingShortcutIndex(null)
    setNewShortcut({ shortcut: "", prompt: "" })
  }
  
  const handleSaveShortcut = () => {
    if (!newShortcut.shortcut || !newShortcut.prompt) {
      return
    }
    
    if (editingShortcutIndex !== null) {
      // 编辑现有快捷提示
      const updatedShortcuts = [...settings.promptShortcuts]
      updatedShortcuts[editingShortcutIndex] = newShortcut
      
      setSettings(prev => ({
        ...prev,
        promptShortcuts: updatedShortcuts
      }))
      
      setEditingShortcutIndex(null)
    } else {
      // 添加新快捷提示
      setSettings(prev => ({
        ...prev,
        promptShortcuts: [...prev.promptShortcuts, newShortcut]
      }))
    }
    
    setIsAddingShortcut(false)
    setNewShortcut({ shortcut: "", prompt: "" })
  }
  
  const handleEditShortcut = (index: number) => {
    setEditingShortcutIndex(index)
    setNewShortcut(settings.promptShortcuts[index])
    setIsAddingShortcut(true)
  }
  
  const handleDeleteShortcut = (index: number) => {
    const updatedShortcuts = settings.promptShortcuts.filter((_, i) => i !== index)
    
    setSettings(prev => ({
      ...prev,
      promptShortcuts: updatedShortcuts
    }))
  }
  
  const handleShortcutInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewShortcut(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // 处理AI模型选择
  const handleModelToggle = (modelId: string) => {
    setAvailableModels(models => 
      models.map(model => ({
        ...model,
        selected: model.id === modelId ? !model.selected : model.selected
      }))
    )
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
  
  // 渲染侧边导航项
  const renderNavItem = (id: string, label: string, icon: React.ReactNode) => (
    <button
      className={`nav-item ${activeSection === id ? 'active' : ''}`}
      onClick={() => setActiveSection(id)}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
  
  return (
    <div className="options-container">
      <div className="options-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>Nexus AI</span>
          </div>
        </div>
        
        <div className="sidebar-nav">
          {renderNavItem("account", "账户", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          )}
          
          {renderNavItem("general", "一般设置", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
          
          {renderNavItem("ai", "AI 设置", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"></path>
              <circle cx="7.5" cy="14.5" r=".5"></circle>
              <circle cx="16.5" cy="14.5" r=".5"></circle>
            </svg>
          )}
          
          {renderNavItem("shortcuts", "快捷提示", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          )}
          
          {renderNavItem("clip", "剪藏设置", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2H2v10h10V2zM12 12H2v10h10V12zM22 2h-10v20h10V2z"></path>
            </svg>
          )}
          
          {renderNavItem("keyboard", "键盘快捷键", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <path d="M6 8h.001"></path>
              <path d="M10 8h.001"></path>
              <path d="M14 8h.001"></path>
              <path d="M18 8h.001"></path>
              <path d="M8 12h.001"></path>
              <path d="M12 12h.001"></path>
              <path d="M16 12h.001"></path>
              <path d="M7 16h10"></path>
            </svg>
          )}
          
          {renderNavItem("about", "关于", 
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 8v4"></path>
              <path d="M12 16h.01"></path>
            </svg>
          )}
        </div>
        
        <div className="sidebar-footer">
          <button className="save-button" onClick={saveSettings} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存设置"}
          </button>
          {saveSuccess && <span className="save-success">已保存!</span>}
        </div>
      </div>
      
      <div className="options-content">
        <div className="content-header">
          <h1 className="page-title">设置</h1>
          <SocialMediaBar />
        </div>
        
        {/* 账户设置 */}
        {activeSection === "account" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">账户信息</h2>
              <p className="settings-card-description">管理您的账户和同步设置</p>
            </div>
            
            {userProfile?.isAuthenticated ? (
              <div className="account-info">
                <div className="user-profile">
                  {userProfile.avatar && (
                    <img 
                      src={userProfile.avatar} 
                      alt="头像" 
                      className="avatar" 
                    />
                  )}
                  <div className="user-details">
                    <div className="user-name">{userProfile.name}</div>
                    <div className="user-email">{userProfile.email}</div>
                  </div>
                </div>
                
                <div className="account-actions">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLogout}
                  >
                    登出
                  </Button>
                  
                  <a href={getFrontendUrl("/account")} target="_blank" rel="noopener noreferrer" className="account-link">
                    管理账户
                  </a>
                </div>
              </div>
            ) : (
              <div className="login-prompt">
                <p>
                  登录 Nexus 账户以同步您的剪藏和设置。
                </p>
                <Button onClick={handleLogin}>登录</Button>
              </div>
            )}
            
            <div className="settings-card">
              <div className="settings-card-header">
                <h3 className="settings-card-title">同步设置</h3>
                <p className="settings-card-description">管理您的数据同步选项</p>
              </div>
              
              <div className="settings-row">
                <div className="setting-label">
                  <label htmlFor="sync-settings">
                    同步设置到所有设备
                  </label>
                  <span className="setting-description">
                    在所有登录相同账户的设备上同步您的设置
                  </span>
                </div>
                <div className="setting-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="sync-settings"
                      name="syncSettings"
                      checked={true}
                      onChange={() => {}}
                      disabled={!userProfile?.isAuthenticated}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="settings-row">
                <div className="setting-label">
                  <label htmlFor="sync-history">
                    同步历史记录
                  </label>
                  <span className="setting-description">
                    在所有设备上同步您的对话历史记录
                  </span>
                </div>
                <div className="setting-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      id="sync-history"
                      name="syncHistory"
                      checked={true}
                      onChange={() => {}}
                      disabled={!userProfile?.isAuthenticated}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 一般设置 */}
        {activeSection === "general" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">一般设置</h2>
              <p className="settings-card-description">调整应用主题和基本功能</p>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="theme">主题</label>
                <span className="setting-description">
                  选择外观主题
                </span>
              </div>
              <div className="setting-control">
                <select
                  id="theme"
                  name="theme"
                  value={settings.theme}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="light">亮色</option>
                  <option value="dark">暗色</option>
                  <option value="system">跟随系统</option>
                </select>
              </div>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="defaultLanguage">默认语言</label>
                <span className="setting-description">
                  AI 将尽可能使用此语言回答
                </span>
              </div>
              <div className="setting-control">
                <select
                  id="defaultLanguage"
                  name="defaultLanguage"
                  value={settings.defaultLanguage}
                  onChange={handleChange}
                  className="select"
                  disabled={settings.useBrowserLanguage}
                >
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                </select>
              </div>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="useBrowserLanguage">
                  使用浏览器语言
                </label>
                <span className="setting-description">
                  自动检测并使用浏览器设置的语言
                </span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="useBrowserLanguage"
                    name="useBrowserLanguage"
                    checked={settings.useBrowserLanguage}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="showBadgeCounter">
                  显示徽章计数器
                </label>
                <span className="setting-description">
                  在扩展图标上显示未处理项的数量
                </span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="showBadgeCounter"
                    name="showBadgeCounter"
                    checked={settings.showBadgeCounter}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="keepSidePanelOpen">
                  保持侧边栏打开
                </label>
                <span className="setting-description">
                  在标签页之间导航时保持侧边栏打开
                </span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="keepSidePanelOpen"
                    name="keepSidePanelOpen"
                    checked={settings.keepSidePanelOpen}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* AI 设置 */}
        {activeSection === "ai" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">AI 设置</h2>
              <p className="settings-card-description">管理AI模型和API密钥</p>
            </div>
            
            <div className="settings-card">
              <div className="settings-card-header">
                <h3 className="settings-card-title">可用模型</h3>
                <p className="settings-card-description">选择您要使用的AI模型</p>
              </div>
              
              <div className="model-list">
                {availableModels.map(model => (
                  <div key={model.id} className="model-item">
                    <div className="model-info">
                      <span className="model-name">{model.name}</span>
                      {model.free && <span className="model-badge free">免费</span>}
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={model.selected}
                        onChange={() => handleModelToggle(model.id)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="settings-card">
              <div className="settings-card-header">
                <h3 className="settings-card-title">API 密钥</h3>
                <p className="settings-card-description">使用您自己的API密钥以使用更多功能</p>
              </div>
              
              <div className="api-key-section">
                <div className="api-key-item">
                  <div className="api-key-header">
                    <span>OpenAI API 密钥</span>
                    <span className="api-key-status">未设置</span>
                  </div>
                  <input
                    type="password"
                    placeholder="sk-..."
                    className="api-key-input"
                  />
                  <div className="api-key-description">
                    可使用GPT-3.5和GPT-4模型
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 快捷提示 */}
        {activeSection === "shortcuts" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">快捷提示</h2>
              <p className="settings-card-description">管理常用提示词快捷方式</p>
            </div>
            
            {!isAddingShortcut && (
              <button className="add-button" onClick={handleAddShortcut}>
                添加新快捷提示
              </button>
            )}
            
            {isAddingShortcut && (
              <div className="shortcut-editor">
                <div className="shortcut-form">
                  <div className="form-group">
                    <label htmlFor="shortcut">快捷指令</label>
                    <input
                      type="text"
                      id="shortcut"
                      name="shortcut"
                      placeholder="/command"
                      value={newShortcut.shortcut}
                      onChange={handleShortcutInputChange}
                      className="input"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="prompt">提示词</label>
                    <input
                      type="text"
                      id="prompt"
                      name="prompt"
                      placeholder="输入对应的提示词..."
                      value={newShortcut.prompt}
                      onChange={handleShortcutInputChange}
                      className="input"
                    />
                  </div>
                </div>
                
                <div className="shortcut-actions">
                  <button className="cancel-button" onClick={handleCancelAddShortcut}>
                    取消
                  </button>
                  <button className="save-button" onClick={handleSaveShortcut}>
                    保存
                  </button>
                </div>
              </div>
            )}
            
            {settings.promptShortcuts.length > 0 ? (
              <table className="shortcuts-table">
                <thead>
                  <tr>
                    <th className="shortcuts-header shortcut-col">快捷指令</th>
                    <th className="shortcuts-header prompt-col">提示词</th>
                    <th className="shortcuts-header actions-col">操作</th>
                  </tr>
                </thead>
                <tbody className="shortcuts-body">
                  {settings.promptShortcuts.map((shortcut, index) => (
                    <tr className="shortcut-row" key={index}>
                      <td className="shortcut-col">{shortcut.shortcut}</td>
                      <td className="prompt-col">{shortcut.prompt}</td>
                      <td className="actions-col">
                        <button className="edit-button" onClick={() => handleEditShortcut(index)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                        </button>
                        <button className="delete-button" onClick={() => handleDeleteShortcut(index)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-shortcuts">
                没有保存的快捷提示
              </div>
            )}
          </div>
        )}
        
        {/* 剪藏设置 */}
        {activeSection === "clip" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">剪藏设置</h2>
              <p className="settings-card-description">自定义剪藏功能的行为</p>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="defaultClipAction">默认剪藏动作</label>
                <span className="setting-description">
                  选中文本后默认执行的操作
                </span>
              </div>
              <div className="setting-control">
                <select
                  id="defaultClipAction"
                  name="defaultClipAction"
                  value={settings.defaultClipAction}
                  onChange={handleChange}
                  className="select"
                >
                  <option value="save">保存</option>
                  <option value="ask">提问</option>
                  <option value="summarize">摘要</option>
                </select>
              </div>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="openSidebarOnClip">
                  剪藏时自动打开侧边栏
                </label>
                <span className="setting-description">
                  剪藏内容时自动打开侧边栏面板
                </span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="openSidebarOnClip"
                    name="openSidebarOnClip"
                    checked={settings.openSidebarOnClip}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="autoSummarize">
                  自动生成内容摘要
                </label>
                <span className="setting-description">
                  剪藏时自动生成内容摘要
                </span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input
                    type="checkbox"
                    id="autoSummarize"
                    name="autoSummarize"
                    checked={settings.autoSummarize}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* 键盘快捷键 */}
        {activeSection === "keyboard" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">键盘快捷键</h2>
              <p className="settings-card-description">管理扩展的键盘快捷键</p>
            </div>
            
            <div className="settings-row">
              <div className="setting-label">
                <label htmlFor="keyboardShortcut">剪藏快捷键</label>
                <span className="setting-description">
                  用于激活扩展的剪藏功能
                </span>
              </div>
              <div className="setting-control">
                <span className="keyboard-shortcut">{settings.keyboardShortcut}</span>
              </div>
            </div>
            
            <div className="keyboard-info">
              <h3>可用快捷键</h3>
              <ul className="keyboard-list">
                <li>
                  <span>打开侧边栏</span>
                  <span className="keyboard-shortcut">⇧⌘S</span>
                </li>
                <li>
                  <span>剪藏选中内容</span>
                  <span className="keyboard-shortcut">⇧⌘E</span>
                </li>
                <li>
                  <span>打开弹出窗口</span>
                  <span className="keyboard-shortcut">⇧⌘P</span>
                </li>
              </ul>
              
              <div className="settings-row" style={{ borderBottom: 'none', paddingTop: '1.5rem' }}>
                <div className="setting-label">
                  <span>自定义键盘快捷键</span>
                  <span className="setting-description">
                    在浏览器的扩展设置中更改快捷键
                  </span>
                </div>
                <div className="setting-control">
                  <button 
                    className="save-button" 
                    onClick={() => {
                      chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
                    }}
                  >
                    配置快捷键
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 关于 */}
        {activeSection === "about" && (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2 className="settings-card-title">关于 Nexus AI</h2>
              <p className="settings-card-description">版本信息和使用帮助</p>
            </div>
            
            <div className="about-info">
              <div className="version-info">
                版本: 1.0.0
              </div>
              
              <div className="about-description">
                <p>
                  Nexus AI 是您的智能助手，帮助您更高效地浏览网页、整理资料和获取信息。利用先进的AI技术，Nexus能够理解您的需求，提供个性化的帮助。
                </p>
                <p>
                  我们致力于提供最佳的用户体验和隐私保护。如果您有任何问题或建议，请随时联系我们。
                </p>
              </div>
              
              <div className="links">
                <a href="https://nexusai.example.com/docs" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  文档
                </a>
                <a href="https://github.com/telepace/nexus" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                    <path d="M9 18c-4.51 2-5-2-7-2"></path>
                  </svg>
                  GitHub
                </a>
                <a href="https://nexusai.example.com/privacy" target="_blank" rel="noopener noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  隐私政策
                </a>
              </div>
              
              <div className="contact">
                © {new Date().getFullYear()} Nexus AI. 保留所有权利。
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部装饰 */}
      <div className="footer-decoration"></div>
    </div>
  )
}

export default OptionsPage 