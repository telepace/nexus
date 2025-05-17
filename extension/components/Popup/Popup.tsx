import React, { useEffect, useState } from 'react';
import { getRecentClippings, login, redirectToOAuthLogin, getUserProfile } from '../../utils/api';
import type { ClippedItem, UserProfile } from '../../utils/interfaces';
import Button from '../ui/button';
import { API_CONFIG } from '../../utils/config';

const Popup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [clippings, setClippings] = useState<ClippedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      
      if (profile) {
        await loadClippings();
      } else {
        setShowLogin(true);
        setIsLoading(false);
      }
    } catch (err) {
      setError((err as Error).message);
      setShowLogin(true);
      setIsLoading(false);
    }
  };

  const loadClippings = async () => {
    try {
      setIsLoading(true);
      const recentClippings = await getRecentClippings(5);
      setClippings(recentClippings);
      setShowLogin(false);
      setIsLoading(false);
    } catch (err) {
      setError((err as Error).message);
      if ((err as Error).message === 'Unauthorized') {
        setShowLogin(true);
      }
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError(null);
      setIsLoading(true);
      const profile = await login(loginData.email, loginData.password);
      setUserProfile(profile);
      await loadClippings();
    } catch (err) {
      setLoginError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'github' | 'microsoft') => {
    redirectToOAuthLogin(provider);
  };

  const handleLoginRedirect = () => {
    if (API_CONFIG.FRONTEND_URL) {
      chrome.tabs.create({ url: `${API_CONFIG.FRONTEND_URL}/login` });
    }
  };

  const handleRegisterRedirect = () => {
    if (API_CONFIG.FRONTEND_URL) {
      chrome.tabs.create({ url: `${API_CONFIG.FRONTEND_URL}/register` });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">登录 Nexus</h1>
        {loginError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {loginError}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="mb-4">
          <div className="mb-3">
            <label htmlFor="email" className="block text-sm font-medium mb-1">邮箱</label>
            <input
              id="email"
              type="email"
              className="w-full p-2 border rounded"
              value={loginData.email}
              onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium mb-1">密码</label>
            <input
              id="password"
              type="password"
              className="w-full p-2 border rounded"
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              required
            />
          </div>
          
          <Button type="submit" className="w-full">登录</Button>
        </form>
        
        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="px-3 text-sm text-gray-500">或</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={() => handleOAuthLogin('google')}
            className="w-full p-2 border border-gray-300 rounded flex items-center justify-center"
          >
            <span>使用 Google 登录</span>
          </button>
          
          {/* 可以根据需要添加更多第三方登录选项 */}
        </div>
        
        <div className="mt-4 text-center text-sm">
          <button 
            onClick={handleRegisterRedirect}
            className="text-blue-600 hover:underline"
          >
            创建新账号
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">最近保存</h1>
        {userProfile && (
          <span className="text-sm text-gray-600">
            {userProfile.name || userProfile.email}
          </span>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}
      
      {clippings.length === 0 ? (
        <div className="text-center p-4 border rounded bg-gray-50">
          <p>没有保存的内容</p>
          <p className="text-sm text-gray-600 mt-2">使用Nexus浏览网页时，可以保存感兴趣的内容</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {clippings.map(clip => (
            <li key={clip.id} data-testid="clipping-item" className="p-3 border rounded hover:bg-gray-50">
              <div className="font-medium truncate">{clip.title}</div>
              <div className="text-sm text-gray-600 mt-1 line-clamp-2">{clip.content}</div>
            </li>
          ))}
        </ul>
      )}
      
      <div className="mt-4">
        <Button 
          onClick={handleLoginRedirect}
          className="w-full"
        >
          访问 Nexus 网页版
        </Button>
      </div>
    </div>
  );
};

export default Popup; 