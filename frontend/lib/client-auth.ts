// 重新导出新的 auth context 功能，保持向后兼容性
export * from "./auth-context";

// 添加向后兼容的cookie操作函数
import { OptimizedTokenManager } from './token-manager';

/**
 * 向后兼容的getCookie函数
 * @deprecated 建议直接使用 OptimizedTokenManager
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue || null;
    }
  }
  return null;
}

/**
 * 向后兼容的setCookie函数
 * @deprecated 建议直接使用 OptimizedTokenManager.setTokens()
 */
export function setCookie(name: string, value: string, options?: {
  maxAge?: number;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}): void {
  if (typeof document === 'undefined') return;
  
  const {
    maxAge = 60 * 60 * 24 * 7, // 7天
    path = '/',
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax'
  } = options || {};
  
  let cookieString = `${name}=${value};path=${path};max-age=${maxAge};SameSite=${sameSite}`;
  if (secure) {
    cookieString += ';Secure';
  }
  
  document.cookie = cookieString;
}

// 导出token相关的便捷函数以保持兼容性
export const getAuthToken = () => OptimizedTokenManager.getAccessToken();
export const setAuthTokens = (tokenInfo: any) => OptimizedTokenManager.setTokens(tokenInfo);
export const clearAuthTokens = () => OptimizedTokenManager.clearTokens();
