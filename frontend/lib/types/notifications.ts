// 全局通知类型定义
export interface ProcessingNotification {
  id: string;
  type: "content-processing" | "content-error" | "content-completed";
  status: "processing" | "completed" | "error";
  title: string;
  message: string;
  contentId?: string;
  progress?: number; // 0-100
  timestamp: Date;
  autoHide?: boolean;
  duration?: number; // milliseconds
  actionUrl?: string; // 点击跳转的URL
  retryAction?: () => void; // 重试操作
}

// SSE事件类型定义
export interface SSENotificationEvent {
  type:
    | "content-status-update"
    | "content-created"
    | "connection-established"
    | "heartbeat";
  content_id?: string;
  status?: "processing" | "completed" | "error";
  title?: string;
  error_message?: string;
  progress?: number;
  content_item?: {
    id: string;
    title?: string;
    processing_status?: string;
    [key: string]: unknown;
  };
  id?: string;
  timestamp?: string;
}

// 通知动作类型
export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: "default" | "primary" | "destructive";
}

// 通知配置
export interface NotificationConfig {
  showProgress?: boolean;
  showAction?: boolean;
  persistOnPageChange?: boolean;
  sound?: boolean;
}
