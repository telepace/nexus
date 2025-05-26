/**
 * 服务器端认证模块桥接文件
 *
 * 这个文件只是一个桥接，负责从服务器端认证模块导出功能
 * 仅用于服务器组件（不带有"use client"的组件）
 */

// 从服务器端认证模块导出 (仅用于服务器组件)
export { getAuthState, getAuthToken, requireAuth } from "./server-auth";
export type { AuthState } from "./server-auth";

// 注意：不要在客户端组件（带有"use client"指令的组件）中导入此文件
// 客户端组件应该使用 'auth.ts' 中的客户端认证功能
