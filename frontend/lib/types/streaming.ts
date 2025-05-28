/**
 * 流式文本相关的类型定义
 */

// 流式响应的基础接口
export interface StreamingResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamingChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 流式选择项
export interface StreamingChoice {
  index: number;
  delta: {
    role?: "assistant" | "user" | "system";
    content?: string;
  };
  finish_reason?: "stop" | "length" | "content_filter" | null;
}

// 流式错误响应
export interface StreamingError {
  error: boolean;
  message: string;
  status_code?: number;
  details?: string;
}

// 流式状态枚举
export enum StreamingStatus {
  IDLE = "idle",
  CONNECTING = "connecting",
  STREAMING = "streaming",
  PAUSED = "paused",
  COMPLETED = "completed",
  ERROR = "error",
}

// 流式事件类型
export type StreamingEvent =
  | { type: "start" }
  | { type: "chunk"; data: string }
  | { type: "complete"; data: string }
  | { type: "error"; error: Error }
  | { type: "pause" }
  | { type: "resume" };

// LLM 消息接口
export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
  name?: string;
}

// LLM 请求参数
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  user?: string;
}

// 内容分析请求
export interface ContentAnalysisRequest {
  system_prompt: string;
  user_prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

// 流式配置选项
export interface StreamingConfig {
  /** 打字机效果延迟（毫秒） */
  typewriterDelay?: number;
  /** 是否启用打字机效果 */
  enableTypewriter?: boolean;
  /** 防抖延迟（毫秒） */
  debounceDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 是否自动重连 */
  autoReconnect?: boolean;
}

// 流式组件的通用 Props
export interface BaseStreamingProps {
  /** 是否启用 Markdown 渲染 */
  enableMarkdown?: boolean;
  /** 是否显示控制按钮 */
  showControls?: boolean;
  /** 是否显示状态指示器 */
  showStatus?: boolean;
  /** 是否显示进度信息 */
  showProgress?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 流式配置 */
  streamingConfig?: StreamingConfig;
  /** 错误处理回调 */
  onError?: (error: Error) => void;
  /** 开始回调 */
  onStart?: () => void;
  /** 完成回调 */
  onComplete?: (content: string) => void;
  /** 内容更新回调 */
  onUpdate?: (content: string) => void;
}

// 聊天消息接口
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// 聊天会话接口
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, unknown>;
}

// 流式分析结果
export interface StreamingAnalysisResult {
  id: string;
  type: "summary" | "key_points" | "questions" | "insights" | "custom";
  title: string;
  content: string;
  status: StreamingStatus;
  progress?: number;
  error?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: {
    model?: string;
    prompt?: string;
    tokens_used?: number;
    processing_time?: number;
  };
}

// API 响应包装器
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status_code?: number;
}

// 流式 API 端点配置
export interface StreamingEndpoint {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// 流式性能指标
export interface StreamingMetrics {
  /** 连接建立时间（毫秒） */
  connectionTime: number;
  /** 首字节时间（毫秒） */
  firstByteTime: number;
  /** 总处理时间（毫秒） */
  totalTime: number;
  /** 接收的字节数 */
  bytesReceived: number;
  /** 接收的块数 */
  chunksReceived: number;
  /** 平均块大小 */
  averageChunkSize: number;
  /** 错误次数 */
  errorCount: number;
  /** 重试次数 */
  retryCount: number;
}
