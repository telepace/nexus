"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddContentModal } from "@/components/layout/AddContentModal";

export default function TestAddContentPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          测试添加内容功能
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          点击按钮测试优化后的添加内容模态框
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => setModalOpen(true)}
            className="w-full"
            size="lg"
          >
            打开添加内容对话框
          </Button>

          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
            <p>
              <strong>优化要点：</strong>
            </p>
            <ul className="text-left space-y-1">
              <li>• 文本框高度限制 (最大300px)</li>
              <li>• 整体对话框高度限制 (90vh)</li>
              <li>• 内容区域可滚动</li>
              <li>• 添加按钮始终可见</li>
              <li>• 字符计数显示</li>
              <li>• 快捷键支持 (Ctrl+Enter)</li>
              <li>• 长内容提醒</li>
            </ul>
          </div>
        </div>

        <AddContentModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </div>
  );
}
