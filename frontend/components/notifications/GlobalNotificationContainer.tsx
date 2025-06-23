"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";
import NotificationCard from "./NotificationCard";
import { ProcessingNotification } from "@/lib/types/notifications";

interface GlobalNotificationContainerProps {
  maxVisible?: number; // 最大显示数量
  className?: string;
}

const GlobalNotificationContainer: React.FC<GlobalNotificationContainerProps> = ({
  maxVisible = 5,
  className = "",
}) => {
  const { notifications, removeNotification } = useGlobalNotificationStore();

  // 限制显示的通知数量，优先显示最新的
  const visibleNotifications = notifications.slice(0, maxVisible);

  // 处理通知关闭
  const handleNotificationClose = (id: string) => {
    removeNotification(id);
  };

  // 处理通知操作（如点击跳转）
  const handleNotificationAction = (notification: ProcessingNotification) => {
    // 如果是已完成的通知，点击后可以自动关闭
    if (notification.status === 'completed' && notification.autoHide) {
      handleNotificationClose(notification.id);
    }
  };

  // 如果没有通知，不渲染容器
  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div 
      className={`
        fixed top-4 right-4 z-50 
        flex flex-col space-y-3 
        max-w-sm w-full
        pointer-events-none
        ${className}
      `}
      style={{
        // 确保通知在最顶层，高于所有其他元素
        zIndex: 9999,
      }}
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <NotificationCard
              notification={notification}
              onClose={handleNotificationClose}
              onAction={handleNotificationAction}
            />
          </div>
        ))}
      </AnimatePresence>
      
      {/* 如果有更多通知未显示，显示提示 */}
      {notifications.length > maxVisible && (
        <div className="pointer-events-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">
              还有 {notifications.length - maxVisible} 条通知...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalNotificationContainer; 