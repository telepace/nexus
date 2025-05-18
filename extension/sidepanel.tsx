import React, { useState, useEffect, useRef } from "react"
import { Storage } from "@plasmohq/storage"
import "./sidepanel.css"
import type { UserProfile } from "~/utils/interfaces"

// 定义消息类型
interface Message {
  id: string
  content: string
  type: "user" | "assistant"
  timestamp: number
}

// 定义对话类型
interface Conversation {
  id: string
  title: string
  messages: Message[]
  created: number
  updated: number
}

const SidePanel: React.FC = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<"chat" | "summary">("chat")
  const [userInput, setUserInput] = useState<string>("")
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // 初始化
  useEffect(() => {
    // 检测系统暗色模式
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDarkMode(prefersDark)
    
    // 加载用户信息
    const loadUserProfile = async () => {
      const storage = new Storage({ area: "local" })
      const profile = await storage.get("userProfile") as UserProfile
      setUserProfile(profile || null)
    }
    
    // 加载对话历史
    const loadConversations = async () => {
      const storage = new Storage({ area: "local" })
      const savedConversations = await storage.get("conversations") as Conversation[]
      if (savedConversations && savedConversations.length > 0) {
        setConversations(savedConversations)
        setCurrentConversation(savedConversations[0])
      } else {
        // 创建新对话
        createNewConversation()
      }
    }
    
    loadUserProfile()
    loadConversations()
    
    // 获取当前页面信息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        // 可以在这里处理页面URL，例如显示页面标题或进行预处理
      }
    })
  }, [])
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [currentConversation?.messages])
  
  // 创建新对话
  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: generateId(),
      title: "新对话",
      messages: [],
      created: Date.now(),
      updated: Date.now()
    }
    
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversation(newConversation)
    saveConversations([newConversation, ...conversations])
  }
  
  // 保存对话
  const saveConversations = async (convs: Conversation[]) => {
    const storage = new Storage({ area: "local" })
    await storage.set("conversations", convs)
  }
  
  // 处理用户输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value)
  }
  
  // 处理用户消息提交
  const handleSubmit = async () => {
    if (!userInput.trim() || !currentConversation) return
    
    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      content: userInput,
      type: "user",
      timestamp: Date.now()
    }
    
    const updatedMessages = [...currentConversation.messages, userMessage]
    const updatedConversation = {
      ...currentConversation,
      messages: updatedMessages,
      updated: Date.now()
    }
    
    // 更新标题（如果是第一条消息）
    if (updatedConversation.messages.length === 1) {
      updatedConversation.title = userInput.slice(0, 30) + (userInput.length > 30 ? "..." : "")
    }
    
    setCurrentConversation(updatedConversation)
    
    // 更新对话列表
    const updatedConversations = conversations.map(conv => 
      conv.id === currentConversation.id ? updatedConversation : conv
    )
    
    setConversations(updatedConversations)
    saveConversations(updatedConversations)
    setUserInput("")
    
    // 模拟AI响应
    await processAIResponse(updatedConversation, updatedConversations)
  }
  
  // 处理AI响应
  const processAIResponse = async (conversation: Conversation, allConversations: Conversation[]) => {
    setIsProcessing(true)
    
    // 这里应该调用实际的AI API，目前使用模拟响应
    setTimeout(() => {
      const aiMessage: Message = {
        id: generateId(),
        content: "这是一个模拟的AI响应。在实际实现中，这里会调用后端API来获取真实的AI回复。",
        type: "assistant",
        timestamp: Date.now()
      }
      
      const updatedMessages = [...conversation.messages, aiMessage]
      const updatedConversation = {
        ...conversation,
        messages: updatedMessages,
        updated: Date.now()
      }
      
      setCurrentConversation(updatedConversation)
      
      // 更新对话列表
      const updatedConversations = allConversations.map(conv => 
        conv.id === conversation.id ? updatedConversation : conv
      )
      
      setConversations(updatedConversations)
      saveConversations(updatedConversations)
      setIsProcessing(false)
    }, 1000)
  }
  
  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  // 生成唯一ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15)
  }
  
  // 切换暗色模式
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.body.classList.toggle("dark-mode")
  }
  
  // 处理页面摘要
  const handleSummary = () => {
    setActiveTab("summary")
    
    // 获取当前页面，然后提取内容并发送给AI进行摘要生成
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "summarize" }, (response) => {
          // 处理摘要响应
          if (response && response.content) {
            // 创建新对话或在现有对话中添加摘要
            // 这里仅是示例，实际实现可能需要更复杂的逻辑
            const summaryMessage: Message = {
              id: generateId(),
              content: `页面摘要：${response.content}`,
              type: "assistant",
              timestamp: Date.now()
            }
            
            if (currentConversation) {
              const updatedConversation = {
                ...currentConversation,
                messages: [...currentConversation.messages, summaryMessage],
                updated: Date.now()
              }
              
              setCurrentConversation(updatedConversation)
              
              const updatedConversations = conversations.map(conv => 
                conv.id === currentConversation.id ? updatedConversation : conv
              )
              
              setConversations(updatedConversations)
              saveConversations(updatedConversations)
            }
          }
        })
      }
    })
  }
  
  // 处理登录
  const handleLogin = () => {
    chrome.tabs.create({ url: "/options.html" })
  }
  
  // 消息组件
  const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
    return (
      <div className={`message ${message.type}`}>
        <div className="message-content">{message.content}</div>
      </div>
    )
  }
  
  return (
    <div className={`container ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="header">
        <div className="header-title">
          <div className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          Nexus AI 助手
        </div>
        
        <div className="header-actions">
          <button className="icon-button" onClick={toggleDarkMode} title={isDarkMode ? "切换到亮色模式" : "切换到暗色模式"}>
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
          
          <button className="icon-button" onClick={() => chrome.tabs.create({ url: "/options.html" })} title="设置">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="action-bar">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`} 
            onClick={() => setActiveTab('chat')}
          >
            对话
          </button>
          <button 
            className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`} 
            onClick={handleSummary}
          >
            摘要
          </button>
        </div>
        
        <button className="new-chat-button" onClick={createNewConversation} title="新建对话">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      
      <div className="content">
        {currentConversation && currentConversation.messages.length > 0 ? (
          <div className="messages">
            {currentConversation.messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="content-placeholder">
            {activeTab === 'chat' 
              ? "开始新对话或选择摘要功能以获取当前页面的摘要。" 
              : "生成当前页面摘要..."}
          </div>
        )}
      </div>
      
      <div className="input-area">
        <div className="input-wrapper">
          <textarea 
            ref={inputRef}
            value={userInput} 
            onChange={handleInputChange} 
            onKeyPress={handleKeyPress}
            placeholder="输入您的问题..."
            disabled={isProcessing}
          />
        </div>
        
        <button 
          className="send-button" 
          onClick={handleSubmit}
          disabled={!userInput.trim() || isProcessing}
        >
          {isProcessing ? (
            <svg className="spinner" viewBox="0 0 50 50">
              <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="footer">
        <div className="action-buttons">
          <button className="icon-button" title="帮助">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          </button>
          
          <button className="icon-button" title="清除对话" onClick={createNewConversation}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
        
        <div className="user-menu">
          <button 
            className="user-menu-button" 
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {userProfile?.isAuthenticated ? (
              <div className="user-avatar">
                {userProfile.avatar ? (
                  <img src={userProfile.avatar} alt="头像" />
                ) : (
                  userProfile.name?.charAt(0) || "?"
                )}
              </div>
            ) : (
              <div className="user-avatar">?</div>
            )}
            <span>{userProfile?.isAuthenticated ? userProfile.name : "登录"}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          
          {showUserMenu && (
            <div className="user-dropdown">
              {!userProfile?.isAuthenticated ? (
                <button className="dropdown-item" onClick={handleLogin}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  <span>登录</span>
                </button>
              ) : (
                <button className="dropdown-item" onClick={handleLogin}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>登出</span>
                </button>
              )}
              
              <button className="dropdown-item" onClick={() => chrome.tabs.create({ url: "https://nexus.yourdomain.com" })}>
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

export default SidePanel 