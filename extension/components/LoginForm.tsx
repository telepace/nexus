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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg">
            N
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎使用 Nexus</h1>
          <p className="text-gray-600">AI 驱动的阅读助手</p>
        </div>

        {/* 主登录卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          {(error || loginError) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-800 text-sm font-medium">{error?.message || loginError}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-green-800 text-sm font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* 快速同步按钮 */}
          <div className="mb-6">
            <button
              onClick={handleSyncFromWeb}
              disabled={isSyncing || isLoading}
              className="w-full flex items-center justify-center p-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
            >
              {isSyncing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  同步中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  一键同步登录状态
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center leading-relaxed">
              💡 如果您已在网页中登录，点击此按钮快速同步
            </p>
          </div>

          {/* 分隔线 */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">或使用邮箱登录</span>
            </div>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pl-11"
                  placeholder="请输入邮箱"
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pl-11"
                  placeholder="请输入密码"
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || isLoading}
              className="w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg"
            >
              {(isLoggingIn || isLoading) ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  登录中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  立即登录
                </>
              )}
            </button>
          </form>

          {/* 其他操作 */}
          <div className="mt-6 space-y-3">
            <button
              onClick={openWebLogin}
              className="w-full flex items-center justify-center py-3 px-4 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 border border-gray-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              在网页中登录
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                还没有账户？{' '}
                <button
                  onClick={() => {
                    const frontendUrl = process.env.PLASMO_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
                    chrome.tabs.create({ url: `${frontendUrl}/register` });
                  }}
                  className="text-blue-600 hover:text-blue-800 underline font-semibold transition-colors"
                >
                  立即注册
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Nexus Extension v0.1.0
          </p>
        </div>
      </div>
    </div>
  );
} 