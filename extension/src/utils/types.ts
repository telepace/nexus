/**
 * 用户相关类型定义
 */

// 用户信息
export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
}

// 登录请求
export interface LoginRequest {
  username: string; // 实际上是邮箱
  password: string;
}

// 登录响应
export interface LoginResponse {
  access_token: string;
}

// 注册请求
export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

// API错误响应
export interface ApiError {
  detail: string;
}

// 身份验证状态
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * LiteLLM 类型定义
 */

// LiteLLM 模型信息
export interface LiteLLMModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

// LiteLLM 消息
export interface LiteLLMMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
}

// LiteLLM 聊天请求
export interface LiteLLMChatRequest {
  model: string;
  messages: LiteLLMMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
}

// LiteLLM 聊天响应中的选择
export interface LiteLLMChoice {
  index: number;
  message: LiteLLMMessage;
  finish_reason: string;
}

// LiteLLM 使用情况
export interface LiteLLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// LiteLLM 聊天响应
export interface LiteLLMChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LiteLLMChoice[];
  usage: LiteLLMUsage;
} 