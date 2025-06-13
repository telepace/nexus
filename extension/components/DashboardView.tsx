import React, { useState, useEffect } from 'react';
import { User } from '../lib/auth';
import { useAuth } from '../lib/useAuth';

interface DashboardViewProps {
  user: User;
}

interface PageData {
  title: string;
  url: string;
  content: string;
  metadata?: {
    wordCount: number;
    readingTime: number;
    contentType: string;
  };
}

export function DashboardView({ user }: DashboardViewProps) {
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // 获取当前页面信息
    getCurrentPageInfo();
  }, []);

  const getCurrentPageInfo = () => {
    setConnectionError(null);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // 修复：使用正确的消息类型
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'EXTRACT_CONTENT' }, // ✅ 与content script匹配
          (response) => {
            // 处理runtime错误
            if (chrome.runtime.lastError) {
              console.log('[DashboardView] Content script connection error (normal):', chrome.runtime.lastError.message);
              setConnectionError('页面内容脚本未加载，请刷新页面');
              return;
            }
            
            if (response?.success) {
              setCurrentPage(response.data);
              setConnectionError(null);
            } else {
              console.log('[DashboardView] Content extraction failed:', response?.error);
              setConnectionError('内容提取失败');
            }
          }
        );
      }
    });
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openDashboard = () => {
    const frontendUrl = process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    chrome.tabs.create({ url: `${frontendUrl}/dashboard` });
  };

  const openContentLibrary = () => {
    const frontendUrl = process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    chrome.tabs.create({ url: `${frontendUrl}/content-library` });
  };

  const openPrompts = () => {
    const frontendUrl = process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    chrome.tabs.create({ url: `${frontendUrl}/prompts` });
  };

  const handleSavePage = () => {
    if (!currentPage) {
      setConnectionError('没有页面数据可保存');
      return;
    }

    setIsLoading(true);
    setConnectionError(null);
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // 修复：使用正确的消息类型
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'SAVE_PAGE' }, // ✅ 与content script匹配
          (response) => {
            setIsLoading(false);
            
            // 处理runtime错误
            if (chrome.runtime.lastError) {
              console.log('[DashboardView] Save page connection error:', chrome.runtime.lastError.message);
              setConnectionError('保存失败：扩展连接错误');
              return;
            }
            
            if (response?.success) {
              console.log('Page saved successfully');
              setConnectionError(null);
              // 显示成功消息
              setConnectionError('✅ 页面已成功保存到内容库');
              // 3秒后清除成功消息
              setTimeout(() => {
                setConnectionError(null);
              }, 3000);
            } else {
              console.log('Save page failed:', response?.error);
              setConnectionError(`❌ 保存失败：${response?.error || '未知错误'}`);
            }
          }
        );
      } else {
        setIsLoading(false);
        setConnectionError('❌ 无法获取当前标签页');
      }
    });
  };

  const handleSummarize = () => {
    if (!currentPage) {
      setConnectionError('没有页面数据可分析');
      return;
    }

    setIsLoading(true);
    setConnectionError(null);
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // 修复：使用正确的消息类型
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'SUMMARIZE_PAGE' }, // ✅ 与content script匹配
          (response) => {
            setIsLoading(false);
            
            // 处理runtime错误
            if (chrome.runtime.lastError) {
              console.log('[DashboardView] Summarize connection error:', chrome.runtime.lastError.message);
              setConnectionError('分析失败：扩展连接错误');
              return;
            }
            
            if (response?.success) {
              console.log('Summary generated successfully');
              setConnectionError(null);
              // 可以添加成功提示
            } else {
              console.log('Summarize failed:', response?.error);
              setConnectionError(`分析失败：${response?.error || '未知错误'}`);
            }
          }
        );
      } else {
        setIsLoading(false);
        setConnectionError('无法获取当前标签页');
      }
    });
  };

  // 生成用户头像
  const getUserAvatar = () => {
    const name = user.full_name || user.email;
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    return (
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {initials}
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 头部用户信息 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center">
            {getUserAvatar()}
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {user.full_name || '用户'}
                </h3>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  已登录
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {connectionError && (
        <div className={`mx-4 mt-4 rounded-lg p-3 ${
          connectionError.startsWith('✅') 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {connectionError.startsWith('✅') ? (
                <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                connectionError.startsWith('✅') 
                  ? 'text-green-800' 
                  : 'text-yellow-800'
              }`}>
                {connectionError}
              </p>
              {!connectionError.startsWith('✅') && (
                <button
                  onClick={getCurrentPageInfo}
                  className="text-yellow-600 hover:text-yellow-800 text-xs underline mt-1"
                >
                  重试
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 当前页面信息 */}
      {currentPage && (
        <div className="bg-white mx-4 mt-4 rounded-lg shadow-sm border border-gray-200">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm leading-snug mb-2">
                  {currentPage.title}
                </h4>
                <p className="text-xs text-gray-500 break-all mb-3">
                  {currentPage.url}
                </p>
                {currentPage.metadata && (
                  <div className="flex space-x-4 text-xs text-gray-400">
                    <span>📄 {currentPage.metadata.wordCount} 字</span>
                    <span>⏱️ {currentPage.metadata.readingTime} 分钟</span>
                    <span>🏷️ {currentPage.metadata.contentType}</span>
                  </div>
                )}
              </div>
              <button
                onClick={getCurrentPageInfo}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="刷新页面信息"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主要功能区域 */}
      <div className="flex-1 p-4 space-y-4">
        {/* 快速操作 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              快速操作
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSavePage}
                disabled={isLoading || !currentPage}
                className="flex flex-col items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-150 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mb-2">
                  💾
                </div>
                <span className="text-xs font-medium text-blue-700">保存页面</span>
              </button>
              
              <button
                onClick={handleSummarize}
                disabled={isLoading || !currentPage}
                className="flex flex-col items-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-purple-150 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white mb-2">
                  🤖
                </div>
                <span className="text-xs font-medium text-purple-700">AI 总结</span>
              </button>
            </div>
          </div>
        </div>

        {/* 导航功能 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              导航
            </h4>
            <div className="space-y-2">
              <button
                onClick={openDashboard}
                className="w-full flex items-center p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center text-white mr-3">
                  📊
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">仪表板</div>
                  <div className="text-xs text-gray-500">查看数据概览</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={openContentLibrary}
                className="w-full flex items-center p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white mr-3">
                  📚
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">内容库</div>
                  <div className="text-xs text-gray-500">管理已保存内容</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={openPrompts}
                className="w-full flex items-center p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white mr-3">
                  💭
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">提示词</div>
                  <div className="text-xs text-gray-500">管理AI提示词</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部状态和操作 */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full mr-2 ${currentPage ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></div>
            {currentPage ? '页面已连接' : connectionError ? '连接异常' : '检测页面中...'}
          </div>
          <div className="text-xs text-gray-400">
            v0.1.0
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="w-full flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin mr-2"></div>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
          退出登录
        </button>
      </div>
    </div>
  );
}