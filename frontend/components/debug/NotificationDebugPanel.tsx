"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGlobalNotificationStore } from "@/lib/stores/useGlobalNotificationStore";

const NotificationDebugPanel: React.FC = () => {
  const { 
    notifications, 
    createContentProcessingNotification,
    createContentCompletedNotification,
    createContentErrorNotification,
    updateContentProgress,
    clearAllNotifications,
    isSSEConnected
  } = useGlobalNotificationStore();

  const testNotifications = () => {
    // 测试处理中通知
    createContentProcessingNotification(
      "test-content-1",
      "测试网页内容",
      "正在分析网页内容..."
    );

    // 模拟进度更新
    setTimeout(() => {
      updateContentProgress("test-content-1", 30, "正在提取文本...");
    }, 1000);

    setTimeout(() => {
      updateContentProgress("test-content-1", 60, "正在进行AI分析...");
    }, 2000);

    setTimeout(() => {
      updateContentProgress("test-content-1", 100, "处理完成");
      // 切换到完成状态
      createContentCompletedNotification(
        "test-content-1", 
        "测试网页内容", 
        "/content-library/reader/test-content-1"
      );
    }, 3000);

    // 测试错误通知
    setTimeout(() => {
      createContentErrorNotification(
        "test-content-2",
        "失败的内容",
        "网络连接失败，无法获取内容",
        () => {
          console.log("重试操作");
          testNotifications();
        }
      );
    }, 4000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>通知系统调试面板</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">SSE连接状态:</span>
          <span className={`text-sm font-medium ${isSSEConnected ? 'text-green-600' : 'text-red-600'}`}>
            {isSSEConnected ? '已连接' : '未连接'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm">当前通知数量:</span>
          <span className="text-sm font-medium">{notifications.length}</span>
        </div>

        <div className="space-y-2">
          <Button onClick={testNotifications} className="w-full">
            测试通知流程
          </Button>
          
          <Button 
            onClick={() => createContentProcessingNotification("test-simple", "简单测试", "测试通知")} 
            variant="outline" 
            className="w-full"
          >
            添加处理中通知
          </Button>
          
          <Button 
            onClick={() => createContentCompletedNotification("test-completed", "完成测试", "/test")} 
            variant="outline" 
            className="w-full"
          >
            添加完成通知
          </Button>
          
          <Button 
            onClick={() => createContentErrorNotification("test-error", "错误测试", "测试错误消息")} 
            variant="outline" 
            className="w-full"
          >
            添加错误通知
          </Button>
          
          <Button 
            onClick={clearAllNotifications} 
            variant="destructive" 
            className="w-full"
          >
            清除所有通知
          </Button>
        </div>

        {/* 通知列表预览 */}
        {notifications.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">当前通知:</h4>
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div key={notification.id} className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="font-medium">{notification.title}</div>
                  <div className="text-gray-600 dark:text-gray-400">{notification.message}</div>
                  <div className="text-gray-500 dark:text-gray-500">
                    状态: {notification.status} 
                    {notification.progress !== undefined && ` (${notification.progress}%)`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationDebugPanel; 