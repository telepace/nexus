import React from 'react';
import { useAuth } from '../lib/useAuth';
import { LoginForm } from './LoginForm';
import { DashboardView } from './DashboardView';

export default function SidePanelApp() {
  const { user, isLoading, checkAuth } = useAuth();

  // 登录成功后的回调函数
  const handleLoginSuccess = async () => {
    console.log('[SidePanelApp] 登录成功，重新检查认证状态');
    // 强制重新检查认证状态以更新UI
    await checkAuth();
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  console.log('[SidePanelApp] 渲染状态 - user:', user ? 'logged in' : 'not logged in', 'isLoading:', isLoading);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {user ? (
        <DashboardView user={user} />
      ) : (
        <div className="p-4">
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        </div>
      )}
    </div>
  );
} 