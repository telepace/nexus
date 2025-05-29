import React from 'react';
import { User } from '../lib/auth';
import { useAuth } from '../lib/useAuth';

interface DashboardViewProps {
  user: User;
}

export function DashboardView({ user }: DashboardViewProps) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
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

  return (
    <div className="p-6 bg-white">
      {/* 用户信息 */}
      <div className="flex items-center mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
          {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{user.full_name || user.email}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
      </div>

      {/* 主要功能按钮 */}
      <div className="space-y-3 mb-6">
        <button
          onClick={openDashboard}
          className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          打开仪表板
        </button>

        <button
          onClick={openContentLibrary}
          className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          内容库
        </button>
      </div>

      {/* 快速操作 */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">快速操作</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              // 这里可以实现保存当前页面的功能
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                  // 发送消息到content script保存页面
                  chrome.tabs.sendMessage(tabs[0].id!, { action: 'savePage' });
                }
              });
            }}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            保存页面
          </button>
          
          <button
            onClick={() => {
              // 这里可以实现AI总结功能
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                  chrome.tabs.sendMessage(tabs[0].id!, { action: 'summarize' });
                }
              });
            }}
            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            AI总结
          </button>
        </div>
      </div>

      {/* 退出登录 */}
      <div className="border-t pt-4 mt-4">
        <button
          onClick={handleLogout}
          className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
        >
          退出登录
        </button>
      </div>
    </div>
  );
} 