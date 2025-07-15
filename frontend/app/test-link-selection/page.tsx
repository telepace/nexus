"use client";

import React, { useState } from "react";
import { AddContentModal } from "@/components/layout/AddContentModal";
import { Button } from "@/components/ui/button";

export default function TestLinkSelectionPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const testContent = `
这是一个包含多个链接的测试文本。用户可以选择性地处理这些链接：

文档链接：https://docs.example.com/api
GitHub仓库：https://github.com/example/project
官方网站：https://www.example.com
博客文章：https://blog.example.com/how-to-use

用户可以选择哪些链接需要单独处理，哪些链接保留在文本中。
这样可以更灵活地控制内容的处理方式。
  `.trim();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(testContent);
      alert("测试内容已复制到剪贴板！现在可以在模态框中粘贴测试。");
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">链接选择功能测试</h1>
        
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">功能说明</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• 当粘贴包含链接的文本时，系统会自动检测所有链接</li>
              <li>• 用户可以选择哪些链接需要单独处理为URL内容项</li>
              <li>• 未选中的链接将保留在文本内容中</li>
              <li>• 支持全选/取消全选操作</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">测试步骤</h2>
            <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
              <li>点击"复制测试内容"按钮复制包含链接的文本</li>
              <li>点击"打开添加内容模态框"</li>
              <li>在文本框中粘贴内容（Ctrl+V 或 ⌘+V）</li>
              <li>观察链接检测和选择界面</li>
              <li>尝试选择/取消选择不同的链接</li>
              <li>尝试全选/取消全选功能</li>
            </ol>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">测试内容</h2>
            <pre className="bg-muted p-4 rounded text-sm whitespace-pre-wrap">
              {testContent}
            </pre>
            <div className="mt-4 space-x-4">
              <Button onClick={copyToClipboard}>
                复制测试内容
              </Button>
              <Button onClick={() => setModalOpen(true)}>
                打开添加内容模态框
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-2">注意事项</h3>
            <p className="text-amber-700 text-sm">
              这是一个测试页面，用于验证链接选择功能。在生产环境中，请确保已正确配置认证和API endpoints。
            </p>
          </div>
        </div>
      </div>

      <AddContentModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />
    </div>
  );
} 