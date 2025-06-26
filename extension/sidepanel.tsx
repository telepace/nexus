import React, { useState, useEffect } from "react"
import { StreamContent } from "./components/StreamContent"
import { AutoAnalysisSettings } from "./components/AutoAnalysisSettings"
import { LoginForm } from "./components/LoginForm"
import { useAuth } from "./lib/useAuth"
import "./style.css"

interface AnalysisState {
  summary: {
    content: string
    loading: boolean
    error: string | null
  }
  keypoints: {
    content: string
    loading: boolean
    error: string | null
  }
  isAutoMode: boolean
  pageData: any | null
}

function IndexSidepanel() {
  // 添加认证状态
  const { user, isLoading: authLoading, checkAuth } = useAuth()
  
  const [pageContent, setPageContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [showSettings, setShowSettings] = useState(false)
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    summary: { content: '', loading: false, error: null },
    keypoints: { content: '', loading: false, error: null },
    isAutoMode: true,
    pageData: null
  })

  // 登录成功后的回调
  const handleLoginSuccess = async () => {
    console.log('[Sidepanel] 登录成功，重新检查认证状态')
    await checkAuth()
  }

  useEffect(() => {
    // 从当前页面获取内容
    getCurrentPageContent()
    
    // 监听background script的分析结果
    setupBackgroundMessageListener()
    
    return () => {
      // 清理监听器
      chrome.runtime.onMessage.removeListener(handleBackgroundMessage)
    }
  }, [])

  const setupBackgroundMessageListener = () => {
    chrome.runtime.onMessage.addListener(handleBackgroundMessage)
  }

  const handleBackgroundMessage = (message: any, sender: any, sendResponse: any) => {
    // 获取当前tab ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTabId = tabs[0]?.id
      
      // 只处理当前tab的消息
      if (message.tabId && message.tabId !== currentTabId) {
        return
      }

      switch (message.type) {
        case 'SUMMARY_CHUNK':
          setAnalysisState(prev => ({
            ...prev,
            summary: {
              ...prev.summary,
              content: prev.summary.content + (message.delta || ''),
              loading: !message.done,
              error: null
            }
          }))
          break

        case 'KEYPOINTS_CHUNK':
          setAnalysisState(prev => ({
            ...prev,
            keypoints: {
              ...prev.keypoints,
              content: prev.keypoints.content + (message.delta || ''),
              loading: !message.done,
              error: null
            }
          }))
          break

        case 'ANALYSIS_COMPLETED':
          console.log('✅ Auto analysis completed for:', message.data?.title)
          setAnalysisState(prev => ({
            ...prev,
            summary: { ...prev.summary, loading: false },
            keypoints: { ...prev.keypoints, loading: false },
            pageData: message.data
          }))
          break

        case 'ANALYSIS_ERROR':
          console.error('❌ Auto analysis error:', message.error)
          const isAuthError = message.isAuthError || 
                             message.error?.includes('登录') || 
                             message.error?.includes('认证')
          
          setAnalysisState(prev => ({
            ...prev,
            summary: { 
              ...prev.summary, 
              loading: false, 
              error: isAuthError ? '🔐 认证失败，请先登录' : message.error 
            },
            keypoints: { 
              ...prev.keypoints, 
              loading: false, 
              error: isAuthError ? '🔐 认证失败，请先登录' : message.error 
            }
          }))
          
          if (isAuthError) {
            setError('请先登录以使用AI分析功能')
          }
          break

        case 'ANALYSIS_AUTH_REQUIRED':
          console.log('🔐 Authentication required for analysis')
          setError('请先登录以使用AI分析功能')
          setAnalysisState(prev => ({
            ...prev,
            summary: { 
              content: '', 
              loading: false, 
              error: '🔐 请先登录以使用AI分析功能' 
            },
            keypoints: { 
              content: '', 
              loading: false, 
              error: '🔐 请先登录以使用AI分析功能' 
            }
          }))
          break
      }
    })
  }

  const getCurrentPageContent = async () => {
    try {
      setLoading(true)
      setError("")
      
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        throw new Error("No active tab found")
      }

      // 首先检查content script是否存在
      let contentScriptReady = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const pingResponse = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
          if (pingResponse?.pong) {
            contentScriptReady = true;
            break;
          }
        } catch (error) {
          console.log(`[Sidepanel] Content script ping attempt ${attempt + 1} failed:`, error.message);
          
          // 如果是第一次尝试失败，等待一下再重试
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!contentScriptReady) {
        throw new Error("无法连接到页面内容脚本，请刷新页面后重试");
      }

      // 向content script请求页面内容
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_PAGE_CONTENT"
      })

      if (response?.content) {
        setPageContent(response.content)
        // 检查是否已有自动分析结果
        checkExistingAnalysis(tab.id)
      } else {
        // 尝试直接提取内容
        const contentResponse = await chrome.tabs.sendMessage(tab.id, {
          type: "EXTRACT_CONTENT"
        })
        
        if (contentResponse?.success && contentResponse?.data) {
          setPageContent(contentResponse.data.content)
          setAnalysisState(prev => ({ ...prev, pageData: contentResponse.data }))
} else {
          throw new Error("Failed to extract page content")
        }
      }
    } catch (err) {
      console.error("Failed to get page content:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      
      // 提供更友好的错误信息
      let friendlyMessage = errorMessage;
      if (errorMessage.includes("Could not establish connection")) {
        friendlyMessage = "无法连接到页面，请刷新页面后重试";
      } else if (errorMessage.includes("Receiving end does not exist")) {
        friendlyMessage = "页面内容脚本未加载，请刷新页面后重试";
      }
      
      setError(friendlyMessage)
    } finally {
      setLoading(false)
    }
  }

  const checkExistingAnalysis = async (tabId: number) => {
    try {
      // 从background script获取已缓存的分析结果
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CACHED_ANALYSIS',
        tabId: tabId
      })

      if (response?.success && response?.data) {
        const { summary, keypoints, pageData } = response.data
        setAnalysisState(prev => ({
          ...prev,
          summary: { 
            content: summary || '', 
            loading: false, 
            error: null 
          },
          keypoints: { 
            content: keypoints || '', 
            loading: false, 
            error: null 
          },
          pageData: pageData
        }))
      }
    } catch (error) {
      console.log('No cached analysis found:', error)
    }
  }

  const handleComplete = (summary: string, keypoints: string) => {
    console.log("Manual analysis complete:", { summary, keypoints })
    // 手动分析完成，可以在这里添加保存到库或其他操作
  }

  const handleError = (errorMsg: string) => {
    setError(errorMsg)
    setAnalysisState(prev => ({
      ...prev,
      summary: { ...prev.summary, error: errorMsg, loading: false },
      keypoints: { ...prev.keypoints, error: errorMsg, loading: false }
    }))
  }

  const handleRetry = async () => {
    try {
      // 首先检查认证状态
      const authResponse = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' })
      if (!authResponse?.isAuthenticated) {
        setError('请先登录以使用AI分析功能')
        setAnalysisState(prev => ({
          ...prev,
          summary: { content: '', loading: false, error: '🔐 请先登录' },
          keypoints: { content: '', loading: false, error: '🔐 请先登录' }
        }))
        return
      }

      // 重置分析状态
      setError('')
      setAnalysisState(prev => ({
        ...prev,
        summary: { content: '', loading: true, error: null },
        keypoints: { content: '', loading: true, error: null }
      }))

      // 触发手动分析
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.id && analysisState.pageData) {
        const response = await chrome.runtime.sendMessage({
          type: 'TRIGGER_MANUAL_ANALYSIS',
          data: analysisState.pageData
        })
        
        if (response?.isAuthError) {
          setError('认证已过期，请重新登录')
          setAnalysisState(prev => ({
            ...prev,
            summary: { content: '', loading: false, error: '🔐 认证已过期' },
            keypoints: { content: '', loading: false, error: '🔐 认证已过期' }
          }))
        }
      }
    } catch (error) {
      console.error('Failed to trigger manual analysis:', error)
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed'
      handleError(errorMessage)
    }
  }

  if (loading) {
    return (
      <div className="w-96 h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">AI 智能分析</h3>
          <p className="text-gray-600">正在提取页面内容...</p>
        </div>
      </div>
    )
  }

  // 显示认证loading状态
  if (authLoading) {
    return (
      <div className="w-96 h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Nexus AI</h3>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  // 如果未登录，显示登录界面
  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

  if (error && !pageContent && !analysisState.summary.content && !analysisState.keypoints.content) {
    return (
      <div className="w-96 h-screen bg-gradient-to-b from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg border border-red-200 max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">😅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">连接异常</h3>
          <p className="text-red-600 mb-6 text-sm leading-relaxed">{error}</p>
          <button
            onClick={getCurrentPageContent}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            🔄 重新连接
          </button>
        </div>
      </div>
    )
  }

  // 优先显示自动分析结果
  const hasAutoAnalysis = analysisState.summary.content || analysisState.keypoints.content || 
                         analysisState.summary.loading || analysisState.keypoints.loading

  return (
    <div className="w-96 h-screen bg-gradient-to-b from-gray-50 via-blue-50 to-indigo-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🧠</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Nexus AI
                </h1>
                <p className="text-sm text-gray-500">智能内容分析</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="设置"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 text-xs">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-600">
              {hasAutoAnalysis ? '自动分析模式' : '手动分析模式'}
            </span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* 设置面板 */}
          {showSettings && (
            <div className="animate-fadeIn">
              <AutoAnalysisSettings onConfigChange={() => {
                console.log('Auto analysis config updated')
              }} />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="animate-slideDown bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-yellow-600">⚠️</span>
                </div>
                <div className="flex-1">
                  <p className="text-yellow-800 text-sm font-medium">{error}</p>
                  {error.includes('登录') && (
                    <button
                      onClick={() => {
                        chrome.tabs.create({ 
                          url: process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000/login' 
                        })
                      }}
                      className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded-lg transition-colors duration-200"
                    >
                      🔐 立即登录
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasAutoAnalysis ? (
            // 自动分析结果 - 改进的卡片设计
            <div className="space-y-4">
              {/* 摘要卡片 */}
              <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <span className="text-white">📄</span>
                      </div>
                      <h3 className="text-white font-semibold">智能摘要</h3>
                      {analysisState.summary.loading && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      )}
                    </div>
                    {analysisState.summary.error && (
                      <button 
                        onClick={handleRetry}
                        className="text-white/80 hover:text-white text-sm underline"
                      >
                        重试
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  {analysisState.summary.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm flex items-center">
                        <span className="mr-2">❌</span>
                        {analysisState.summary.error}
                      </p>
                    </div>
                  ) : (
                    <div className="min-h-[60px]">
                      {analysisState.summary.content ? (
                        <div 
                          className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: analysisState.summary.content.replace(/\n/g, '<br/>') 
                          }}
                        />
                      ) : analysisState.summary.loading ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <span className="text-sm ml-2">正在生成摘要...</span>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">等待自动分析...</p>
                      )}
                      {analysisState.summary.loading && analysisState.summary.content && (
                        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 rounded-sm"></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 关键要点卡片 */}
              <div className="bg-white rounded-2xl shadow-md border border-green-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <span className="text-white">🔑</span>
                      </div>
                      <h3 className="text-white font-semibold">关键要点</h3>
                      {analysisState.keypoints.loading && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      )}
                    </div>
                    {analysisState.keypoints.error && (
                      <button 
                        onClick={handleRetry}
                        className="text-white/80 hover:text-white text-sm underline"
                      >
                        重试
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  {analysisState.keypoints.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm flex items-center">
                        <span className="mr-2">❌</span>
                        {analysisState.keypoints.error}
                      </p>
                    </div>
                  ) : (
                    <div className="min-h-[60px]">
                      {analysisState.keypoints.content ? (
                        <div 
                          className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: analysisState.keypoints.content.replace(/\n/g, '<br/>') 
                          }}
                        />
                      ) : analysisState.keypoints.loading ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <span className="text-sm ml-2">正在提取要点...</span>
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-sm">等待自动分析...</p>
                      )}
                      {analysisState.keypoints.loading && analysisState.keypoints.content && (
                        <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1 rounded-sm"></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleRetry}
                  disabled={analysisState.summary.loading || analysisState.keypoints.loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <span>🔄</span>
                  <span>重新生成</span>
                </button>
                
                {analysisState.summary.content && analysisState.keypoints.content && (
                  <button
                    onClick={() => {
                      const content = `## 摘要\n\n${analysisState.summary.content}\n\n## 关键要点\n\n${analysisState.keypoints.content}`
                      navigator.clipboard.writeText(content)
                    }}
                    className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                  >
                    <span>📋</span>
                    <span>复制</span>
                  </button>
                )}
              </div>
            </div>
          ) : pageContent ? (
            // 手动分析模式
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">手动分析模式</h3>
                <p className="text-sm text-gray-600">点击开始按钮进行智能分析</p>
              </div>
              <StreamContent
                text={pageContent}
                autoStart={false}
                onComplete={handleComplete}
                onError={handleError}
              />
            </div>
          ) : (
            // 无内容状态
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📄</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">无页面内容</h3>
              <p className="text-gray-600 mb-6">未能获取当前页面的内容</p>
              <button
                onClick={getCurrentPageContent}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                🔄 重新获取
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default IndexSidepanel 