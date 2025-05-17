/**
 * 认证模块桥接文件
 * 
 * 这个文件只是一个桥接，为客户端组件导出客户端认证功能
 * 注意：服务器端认证功能已移至 'server-auth-bridge.ts'
 */

// 仅从客户端认证模块导出 (用于客户端组件)
export { useAuth, getCookie } from './client-auth';
export type { User, AuthContextType } from './client-auth';

// 注意：服务器端认证功能不应在此导入
// 客户端组件应仅使用useAuth和getCookie
