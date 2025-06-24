import React from "react";
import NotificationDebugPanel from "@/components/debug/NotificationDebugPanel";

export default function TestNotificationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">通知系统测试页面</h1>
        <p className="text-muted-foreground">
          这个页面用于测试跨页面通知系统的功能。
          <br />
          您可以在这里创建各种通知，然后导航到其他页面查看通知是否持续显示。
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <NotificationDebugPanel />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">测试说明</h2>
          <div className="space-y-3 text-sm">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                🔄 测试流程
              </h3>
              <p className="text-blue-800 dark:text-blue-200">
                点击&ldquo;测试通知流程&rdquo;按钮将会模拟一个完整的内容处理流程：
                处理中 → 进度更新 → 完成，同时还会创建一个错误通知示例。
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                🌐 跨页面测试
              </h3>
              <p className="text-green-800 dark:text-green-200">
                创建通知后，尝试导航到其他页面（如 /dashboard 或
                /content-library）， 通知应该继续显示在页面右上角。
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <h3 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                🔌 SSE连接状态
              </h3>
              <p className="text-yellow-800 dark:text-yellow-200">
                左侧面板显示了SSE连接状态。如果显示&ldquo;已连接&rdquo;，
                说明实时通知系统正常工作。
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <h3 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                ⚡ 交互测试
              </h3>
              <p className="text-purple-800 dark:text-purple-200">
                - 点击完成通知可以跳转到指定页面
                <br />- 点击错误通知的&ldquo;重试&rdquo;按钮可以重新执行操作
                <br />- 点击通知卡片右上角的X可以关闭通知
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-2">快速导航测试</h3>
            <div className="flex flex-wrap gap-2">
              <a
                href="/dashboard"
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                仪表板
              </a>
              <a
                href="/content-library"
                className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm hover:bg-green-200 dark:hover:bg-green-800"
              >
                内容库
              </a>
              <a
                href="/settings"
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm hover:bg-purple-200 dark:hover:bg-purple-800"
              >
                设置
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
