import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  ProcessingNotification,
  SSENotificationEvent,
} from "@/lib/types/notifications";

interface GlobalNotificationStore {
  // 状态
  notifications: ProcessingNotification[];
  isSSEConnected: boolean;

  // 通知管理操作
  addNotification: (
    notification: Omit<ProcessingNotification, "id" | "timestamp">,
  ) => string;
  updateNotification: (
    id: string,
    update: Partial<ProcessingNotification>,
  ) => void;
  removeNotification: (id: string) => void;
  clearCompletedNotifications: () => void;
  clearAllNotifications: () => void;

  // SSE连接状态
  setSSEConnected: (connected: boolean) => void;

  // 便捷方法
  createContentProcessingNotification: (
    contentId: string,
    title: string,
    message?: string,
  ) => string;
  createContentCompletedNotification: (
    contentId: string,
    title: string,
    actionUrl?: string,
  ) => string;
  createContentErrorNotification: (
    contentId: string,
    title: string,
    errorMessage: string,
    retryAction?: () => void,
  ) => string;
  updateContentProgress: (
    contentId: string,
    progress: number,
    message?: string,
  ) => void;

  // 从SSE事件创建通知
  handleSSEEvent: (event: SSENotificationEvent) => void;
}

// 生成唯一ID
const generateId = () =>
  `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 创建Store
export const useGlobalNotificationStore = create<GlobalNotificationStore>()(
  devtools(
    (set, get) => ({
      // 初始状态
      notifications: [],
      isSSEConnected: false,

      // 添加通知
      addNotification: (notification) => {
        const id = generateId();
        const newNotification: ProcessingNotification = {
          ...notification,
          id,
          timestamp: new Date(),
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));

        // 自动清理已完成的通知
        if (newNotification.autoHide && newNotification.duration) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      // 更新通知
      updateNotification: (id, update) => {
        set((state) => ({
          notifications: state.notifications.map((notification) =>
            notification.id === id
              ? { ...notification, ...update, timestamp: new Date() }
              : notification,
          ),
        }));

        // 如果更新后设置了自动隐藏，启动定时器
        const notification = get().notifications.find((n) => n.id === id);
        if (
          notification?.autoHide &&
          notification.duration &&
          update.status === "completed"
        ) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }
      },

      // 移除通知
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.id !== id,
          ),
        }));
      },

      // 清理已完成的通知
      clearCompletedNotifications: () => {
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.status !== "completed",
          ),
        }));
      },

      // 清理所有通知
      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      // 设置SSE连接状态
      setSSEConnected: (connected) => {
        set({ isSSEConnected: connected });
      },

      // 便捷方法：创建内容处理中通知
      createContentProcessingNotification: (contentId, title, message) => {
        return get().addNotification({
          type: "content-processing",
          status: "processing",
          title,
          message: message || "正在处理中...",
          contentId,
          progress: 0,
          autoHide: false,
        });
      },

      // 便捷方法：创建内容完成通知
      createContentCompletedNotification: (contentId, title, actionUrl) => {
        return get().addNotification({
          type: "content-completed",
          status: "completed",
          title,
          message: "内容处理完成",
          contentId,
          progress: 100,
          autoHide: true,
          duration: 5000,
          actionUrl,
        });
      },

      // 便捷方法：创建内容错误通知
      createContentErrorNotification: (
        contentId,
        title,
        errorMessage,
        retryAction,
      ) => {
        return get().addNotification({
          type: "content-error",
          status: "error",
          title,
          message: errorMessage,
          contentId,
          autoHide: false,
          retryAction,
        });
      },

      // 便捷方法：更新内容处理进度
      updateContentProgress: (contentId, progress, message) => {
        const { notifications, updateNotification } = get();
        const notification = notifications.find(
          (n) => n.contentId === contentId && n.status === "processing",
        );

        if (notification) {
          updateNotification(notification.id, {
            progress,
            message: message || `处理进度 ${progress}%`,
          });
        }
      },

      // 处理SSE事件
      handleSSEEvent: (event) => {
        // Normalize event.type naming: backend may use snake_case while frontend expects kebab-case
        const normalizedType = event.type?.replace(
          /_/g,
          "-",
        ) as SSENotificationEvent["type"];
        // Clone event with normalized type for switch matching, fallback to original
        const evt = {
          ...event,
          type: normalizedType || event.type,
        } as SSENotificationEvent;
        const {
          updateNotification,
          createContentProcessingNotification,
          createContentCompletedNotification,
          createContentErrorNotification,
          notifications,
        } = get();

        switch (evt.type) {
          case "content-status-update":
            if (evt.content_id) {
              // 查找现有通知
              const existingNotification = notifications.find(
                (n) =>
                  n.contentId === evt.content_id && n.status === "processing",
              );

              if (evt.status === "processing") {
                if (!existingNotification) {
                  // 创建新的处理中通知
                  createContentProcessingNotification(
                    evt.content_id,
                    evt.title || "处理内容",
                    "内容正在处理中...",
                  );
                } else {
                  // 更新现有通知的进度
                  updateNotification(existingNotification.id, {
                    progress: evt.progress || existingNotification.progress,
                    message: `处理进度 ${evt.progress || 0}%`,
                  });
                }
              } else if (evt.status === "completed") {
                if (existingNotification) {
                  // 更新为完成状态
                  updateNotification(existingNotification.id, {
                    status: "completed",
                    type: "content-completed",
                    progress: 100,
                    message: "内容处理完成",
                    autoHide: true,
                    duration: 5000,
                    actionUrl: `/content-library/reader/${evt.content_id}`,
                  });
                } else {
                  // 创建完成通知
                  createContentCompletedNotification(
                    evt.content_id,
                    evt.title || "内容处理完成",
                    `/content-library/reader/${evt.content_id}`,
                  );
                }
              } else if (evt.status === "error") {
                if (existingNotification) {
                  // 更新为错误状态
                  updateNotification(existingNotification.id, {
                    status: "error",
                    type: "content-error",
                    message: evt.error_message || "处理失败",
                    autoHide: false,
                  });
                } else {
                  // 创建错误通知
                  createContentErrorNotification(
                    evt.content_id,
                    evt.title || "处理失败",
                    evt.error_message || "内容处理时发生错误",
                  );
                }
              }
            }
            break;

          case "content-created":
            if (evt.content_item) {
              // 内容创建成功，可能需要处理
              const contentItem = evt.content_item;
              if (contentItem.processing_status === "processing") {
                createContentProcessingNotification(
                  contentItem.id,
                  contentItem.title || "新内容",
                  "正在分析内容...",
                );
              }
            }
            break;

          case "connection-established":
            // SSE连接建立
            console.log("SSE连接已建立");
            break;

          case "heartbeat":
            // 心跳事件，无需处理
            break;

          default:
            console.log("未知的SSE事件类型:", evt.type);
        }
      },
    }),
    {
      name: "global-notification-store",
    },
  ),
);
