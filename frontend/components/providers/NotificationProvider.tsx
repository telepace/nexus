"use client";

import React from "react";
import { useGlobalSSENotifications } from "@/hooks/useGlobalSSENotifications";
import { GlobalNotificationContainer } from "@/components/notifications";

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  // 初始化全局SSE连接
  useGlobalSSENotifications({
    enabled: true,
    autoReconnect: true,
    reconnectInterval: 3000,
    onConnectionChange: (connected) => {
      console.log(`SSE连接状态变化: ${connected ? "已连接" : "已断开"}`);
    },
    onError: (error) => {
      console.error("SSE连接错误:", error);
    },
  });

  return (
    <>
      {children}
      {/* 全局通知容器 */}
      <GlobalNotificationContainer maxVisible={5} />
    </>
  );
};
