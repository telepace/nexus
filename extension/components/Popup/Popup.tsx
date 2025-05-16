import React, { useEffect, useState } from 'react';
import { getRecentClippings, login } from '../../utils/api';
import type { ClippedItem } from '../../utils/interfaces';
import Button from '../ui/button';

const Popup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [clippings, setClippings] = useState<ClippedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    loadClippings();
  }, []);

  const loadClippings = async () => {
    try {
      setIsLoading(true);
      const recentClippings = await getRecentClippings(5);
      setClippings(recentClippings);
      setShowLogin(false);
    } catch (err) {
      setError((err as Error).message);
      if ((err as Error).message === 'Unauthorized') {
        setShowLogin(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError(null);
      await login(loginData.email, loginData.password);
      await loadClippings();
    } catch (err) {
      setLoginError((err as Error).message);
    }
  };

  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (showLogin) {
    return (
      <div>
        <h1>登录</h1>
        {loginError && <div className="error">{loginError}</div>}
        <form onSubmit={handleLogin}>
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            value={loginData.email}
            onChange={e => setLoginData({ ...loginData, email: e.target.value })}
            required
          />
          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            value={loginData.password}
            onChange={e => setLoginData({ ...loginData, password: e.target.value })}
            required
          />
          <Button type="submit">登录</Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1>最近保存</h1>
      {error && <div className="error">{error}</div>}
      {clippings.length === 0 ? (
        <div>没有保存的内容</div>
      ) : (
        <ul>
          {clippings.map(clip => (
            <li key={clip.id} data-testid="clipping-item">
              <div className="title">{clip.title}</div>
              <div>{clip.content.substring(0, 100)}...</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Popup; 