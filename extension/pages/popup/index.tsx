import React, { useEffect, useState, useRef } from "react"
import { Storage } from "@plasmohq/storage"
import type { ClippedItem, UserSettings, UserProfile } from "~/utils/interfaces"
import { getRecentClippings, saveClipping } from "~/utils/api"
import { extractMainContent } from "~/utils/commons"
import { getFrontendUrl } from "~/utils/config"
import { sendToBackground } from "@plasmohq/messaging"
import "./popup.css"

// 定义组件 Props 类型
interface RecentItemProps {
  item: ClippedItem
  onClick: (item: ClippedItem) => void
}

// 最近剪藏项组件
const RecentItem: React.FC<RecentItemProps> = ({ item, onClick }) => {
  return (
    <div className="recent-item" onClick={() => onClick(item)}>
      <div className="item-title">{item.title}</div>
      <div className="item-url">{item.url}</div>
    </div>
  )
}

// 主 Popup 组件
const PopupApp: React.FC = () => {
  // 状态定义
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [recentItems, setRecentItems] = useState<ClippedItem[]>([])
  const [currentUrl, setCurrentUrl] = useState("")
  const [currentTitle, setCurrentTitle] = useState("")
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false)
  
  // 用户认证状态
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [authChecking, setAuthChecking] = useState<boolean>(true)
  
  // 检测系统暗色模式并应用
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    
    if (prefersDark) {
      document.body.classList.add('dark-mode');
    }
  }, []);
  
  // 切换暗色模式
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('dark-mode');
  };
  
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
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
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
        const storage = new Storage({ area: "local" });
        const userSettings = await storage.get("userSettings") as UserSettings;
        setSettings(userSettings || {
          theme: 'system',
          defaultClipAction: 'save',
          openSidebarOnClip: false,
          autoSummarize: false,
          defaultLanguage: 'zh',
          showBadgeCounter: true,
          useBrowserLanguage: false,
          keepSidePanelOpen: false,
          promptShortcuts: []
        });
        
        // 获取用户信息
        const profile = await storage.get("userProfile") as UserProfile;
        setUserProfile(profile || null);
        setIsAuthenticated(!!profile?.isAuthenticated);
        
        // 获取最近剪藏
        try {
          const items = await getRecentClippings(3);
          setRecentItems(items);
        } catch (error) {
          console.error("获取剪藏失败:", error);
          // 不要因为这个而阻止主要功能
        }
      } catch (err) {
        console.error("初始化错误:", err);
        setError("初始化失败，请重新打开扩展。");
      } finally {
        setAuthChecking(false);
      }
    };
    
    initialize();
  }, []);
  
  // 安全地发送消息到内容脚本
  const safelySendMessage = async (message: any): Promise<any> => {
    if (!currentTabId) {
      throw new Error("当前标签页ID未知");
    }
    
    return new Promise((resolve, reject) => {
      try {
        // 设置超时
        const timeoutId = setTimeout(() => {
          reject(new Error("消息发送超时"));
        }, 5000);
        
        chrome.tabs.sendMessage(currentTabId, message, (response) => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            // 如果出错，可能是内容脚本未加载，尝试注入并重试
            return tryContentScriptFallback(message, resolve, reject);
          }
          
          if (!response) {
            return reject(new Error("内容脚本未响应"));
          }
          
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  };
  
  // 内容脚本注入后备方案
  const tryContentScriptFallback = async (message: any, resolve: Function, reject: Function) => {
    try {
      if (!currentTabId) {
        return reject(new Error("当前标签页ID未知"));
      }
      
      // 尝试注入内容脚本
      await chrome.scripting.executeScript({
        target: { tabId: currentTabId },
        files: ["content.js"]
      });
      
      // 等待脚本初始化
      setTimeout(() => {
        // 重新发送消息
        chrome.tabs.sendMessage(currentTabId, message, (response) => {
          if (chrome.runtime.lastError || !response) {
            return reject(new Error("内容脚本注入后仍无响应"));
          }
          
          resolve(response);
        });
      }, 500);
    } catch (error) {
      reject(error);
    }
  };
  
  // 处理剪藏操作
  const handleClip = async () => {
    if (!currentTabId || !currentUrl) {
      setError("无法获取当前页面信息");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // 从页面提取内容
      const extractResult = await safelySendMessage({ action: "extract" });
      
      if (!extractResult || !extractResult.content) {
        throw new Error("无法提取页面内容");
      }
      
      // 保存剪藏
      const newItem: Omit<ClippedItem, "id"> = {
        title: currentTitle,
        content: extractResult.content,
        url: currentUrl,
        status: "unread",
        timestamp: Date.now()
      };
      
      await saveClipping(newItem);
      
      // 根据设置决定是否打开侧边栏
      if (settings?.openSidebarOnClip) {
        try {
          chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        } catch (error) {
          console.error("无法打开侧边栏:", error);
        }
      }
      
      // 根据设置执行自动摘要
      if (settings?.autoSummarize) {
        safelySendMessage({ action: "summarize" })
          .catch(err => console.error("自动摘要失败:", err));
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // 刷新最近剪藏列表
      const items = await getRecentClippings(3);
      setRecentItems(items);
    } catch (error) {
      console.error("剪藏失败:", error);
      setError("剪藏失败: " + (error.message || "未知错误"));
    } finally {
      setIsSaving(false);
    }
  };
  
  // 处理摘要操作
  const handleSummarize = async () => {
    if (!currentTabId) return;
    
    try {
      // 尝试打开侧边栏并发送摘要请求
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "summarize" });
      }, 500);
    } catch (error) {
      console.error("摘要操作失败:", error);
      setError("摘要操作失败: " + (error.message || "未知错误"));
    }
  };
  
  // 处理要点提取操作
  const handleExtractPoints = async () => {
    if (!currentTabId) return;
    
    try {
      // 尝试打开侧边栏并发送提取要点请求
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "extractPoints" });
      }, 500);
    } catch (error) {
      console.error("要点提取失败:", error);
      setError("要点提取失败: " + (error.message || "未知错误"));
    }
  };
  
  // 处理AI聊天操作
  const handleAskAI = async () => {
    if (!currentTabId) return;
    
    try {
      // 尝试打开侧边栏
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "openAIChat" });
      }, 500);
    } catch (error) {
      console.error("AI聊天功能失败:", error);
      setError("AI聊天功能失败: " + (error.message || "未知错误"));
    }
  };
  
  // 打开设置页面
  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };
  
  // 打开主应用
  const openMainApp = () => {
    chrome.tabs.create({ url: getFrontendUrl() });
  };
  
  // 查看剪藏项
  const viewClipping = (item: ClippedItem) => {
    chrome.tabs.create({ url: item.url });
  };
  
  // 处理登录
  const handleLogin = () => {
    chrome.tabs.create({ url: getFrontendUrl("/login") });
  };
  
  // 处理登出
  const handleLogout = async () => {
    try {
      await sendToBackground({
        name: "auth",
        body: { action: "logout" }
      });
      
      // 清除本地用户状态
      setUserProfile(null);
      setIsAuthenticated(false);
      setShowUserMenu(false);
      
      // 清除本地存储
      const storage = new Storage({ area: "local" });
      await storage.remove("userProfile");
    } catch (error) {
      console.error("登出失败:", error);
      setError("登出失败: " + (error.message || "未知错误"));
    }
  };
  
  // 错误状态渲染
  if (error) {
    return (
      <div className="popup-container">
        <div className="popup-header">
          <div className="header-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>Nexus AI</span>
          </div>
        </div>
        
        <div className="error-message">
          {error}
        </div>
        
        <button 
          className="main-action-button" 
          onClick={() => setError(null)}
        >
          重试
        </button>
      </div>
    );
  }
  
  // 加载状态渲染
  if (authChecking) {
    return (
      <div className="popup-container">
        <div className="loading">
          <svg className="spinner" viewBox="0 0 50 50">
            <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
          </svg>
          <div>加载中...</div>
        </div>
      </div>
    );
  }
  
  // 主界面渲染
  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="header-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span>Nexus AI</span>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={toggleDarkMode} 
            title={isDarkMode ? "切换到亮色模式" : "切换到暗色模式"}
            style={{ 
              background: "none", 
              border: "none", 
              cursor: "pointer",
              color: "var(--muted-foreground)" 
            }}
          >
            {isDarkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {saveSuccess && (
        <div className="success-message">
          剪藏成功！
        </div>
      )}
      
      <div className="popup-content">
        <div className="actions-section">
          <div className="main-action">
            <button 
              className="main-action-button" 
              onClick={handleClip}
              disabled={isSaving || !currentTabId || !canAccessCurrentPage(currentUrl)}
            >
              {isSaving ? (
                <>
                  <svg className="spinner" viewBox="0 0 50 50" width="16" height="16">
                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                  </svg>
                  <span>剪藏中...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>剪藏当前页面</span>
                </>
              )}
            </button>
          </div>
          
          <div className="quick-actions">
            <button 
              className="quick-action-button" 
              onClick={handleSummarize}
              disabled={!currentTabId || !canAccessCurrentPage(currentUrl)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span className="action-label">摘要</span>
            </button>
            
            <button 
              className="quick-action-button"
              onClick={handleExtractPoints}
              disabled={!currentTabId || !canAccessCurrentPage(currentUrl)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <span className="action-label">要点</span>
            </button>
            
            <button 
              className="quick-action-button"
              onClick={handleAskAI}
              disabled={!currentTabId || !canAccessCurrentPage(currentUrl)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="action-icon">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span className="action-label">AI 聊天</span>
            </button>
          </div>
        </div>
        
        {recentItems.length > 0 && (
          <div className="recent-section">
            <div className="section-header">
              <span>最近剪藏</span>
              <span className="view-all" onClick={openMainApp}>查看全部</span>
            </div>
            <div className="recent-items">
              {recentItems.map((item) => (
                <RecentItem 
                  key={item.id} 
                  item={item} 
                  onClick={viewClipping} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="popup-footer">
        <button className="settings-button" onClick={openSettings}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>设置</span>
        </button>
        
        <div className="user-menu">
          <button 
            className="user-menu-button" 
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {isAuthenticated && userProfile ? (
              <div className="user-avatar">
                {userProfile.avatar ? (
                  <img src={userProfile.avatar} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userProfile.name?.charAt(0) || "?"
                )}
              </div>
            ) : (
              <div className="user-avatar">?</div>
            )}
            <span>{isAuthenticated && userProfile?.name ? userProfile.name : "登录"}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              {!isAuthenticated ? (
                <button className="dropdown-item" onClick={handleLogin}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>登录</span>
                </button>
              ) : (
                <button className="dropdown-item" onClick={handleLogout}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>登出</span>
                </button>
              )}
              
              <button className="dropdown-item" onClick={openMainApp}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>访问 Nexus 主页</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PopupApp 