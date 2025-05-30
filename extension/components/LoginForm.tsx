import React, { useState } from 'react';
import { useAuth } from '../lib/useAuth';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const { login, isLoading, error, syncFromWeb } = useAuth();
  const [email, setEmail] = useState('admin@telepace.cc'); // 修改为实际存在的用户
  const [password, setPassword] = useState('telepace'); // 修改为正确的密码
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    setSuccessMessage('');

    try {
      console.log('[LoginForm] 开始登录流程');
      await login(email, password);
      console.log('[LoginForm] 登录成功');
      setSuccessMessage('登录成功！');
      
      // 延迟一下以显示成功消息，然后执行回调
      setTimeout(() => {
        console.log('[LoginForm] 执行登录成功回调');
        onLoginSuccess?.();
      }, 500); // 减少延迟时间
    } catch (err) {
      console.error('[LoginForm] 登录失败:', err);
      setLoginError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSyncFromWeb = async () => {
    setIsSyncing(true);
    setLoginError('');
    setSuccessMessage('');

    try {
      console.log('[LoginForm] 开始从Web同步');
      const synced = await syncFromWeb();
      console.log('[LoginForm] 同步结果:', synced);
      
      if (synced) {
        setSuccessMessage('同步成功！正在更新状态...');
        
        // 延迟一下以显示成功消息，然后执行回调
        setTimeout(() => {
          console.log('[LoginForm] 执行同步成功回调');
          onLoginSuccess?.();
        }, 500); // 减少延迟时间
      } else {
        setLoginError('未在网页中找到登录状态，请先在网页中登录');
      }
    } catch (err) {
      console.error('[LoginForm] 同步失败:', err);
      setLoginError('同步失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsSyncing(false);
    }
  };

  const openWebLogin = () => {
    const frontendUrl = process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const loginUrl = `${frontendUrl}/login?extension_callback=true`;
    console.log('[LoginForm] 打开Web登录页面:', loginUrl);
    chrome.tabs.create({ url: loginUrl });
  };

  return (
    <div className="w-full mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Nexus 登录</h1>
        <p className="text-gray-600 text-sm">登录到您的 Nexus 账户</p>
      </div>

      {(error || loginError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error?.message || loginError}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={handleSyncFromWeb}
          disabled={isSyncing || isLoading}
          className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSyncing ? '同步中...' : '从网页同步登录状态'}
        </button>
        <p className="text-xs text-gray-500 mt-1 text-center">
          如果您已在网页中登录，点击此按钮同步登录状态
        </p>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">或</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入邮箱"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            密码
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入密码"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoggingIn || isLoading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {(isLoggingIn || isLoading) ? '登录中...' : '登录'}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={openWebLogin}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          在网页中登录
        </button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          还没有账户？{' '}
          <button
            onClick={() => {
              const frontendUrl = process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
              chrome.tabs.create({ url: `${frontendUrl}/register` });
            }}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            立即注册
          </button>
        </p>
      </div>
    </div>
  );
} 