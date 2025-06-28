"use client";

import { useState } from "react";
import OptimizedAddContentDialog from "@/components/layout/OptimizedAddContentDialog";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles } from "lucide-react";

export default function TestOptimizedAddContentPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            优化的添加内容组件演示
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            基于参考设计风格重构的上传文档逻辑部分
          </p>

          {/* 触发按钮 */}
          <Button
            onClick={() => setOpen(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            打开添加内容对话框
          </Button>
        </div>

        {/* 功能特点介绍 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              智能内容分析
            </h3>
            <p className="text-gray-600">
              自动检测输入的内容类型：链接、研究主题、文档、图片等，提供相应的处理建议
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              拖拽上传
            </h3>
            <p className="text-gray-600">
              支持拖拽文件上传，自动识别文件类型并显示相应图标，提供直观的文件管理界面
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              研究模式
            </h3>
            <p className="text-gray-600">
              智能识别研究类问题，提供深度研究选项，支持快捷键操作提升使用效率
            </p>
          </div>
        </div>

        {/* 设计特点 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">设计优化特点</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                UI/UX 优化
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 固定尺寸容器，避免内容变化时的界面跳动</li>
                <li>• 统一的视觉语言和配色方案</li>
                <li>• 渐进式信息展示，减少认知负担</li>
                <li>• 智能的内容类型提示和图标系统</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                交互优化
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 自适应的 Textarea 高度调整</li>
                <li>• 完整的拖拽文件支持</li>
                <li>• 快捷键支持 (⌘+Enter, ⌘+⇧+Enter)</li>
                <li>• 智能的粘贴处理和URL检测</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                技术优化
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 极简基础组件，减少依赖</li>
                <li>• 优化的状态管理和事件处理</li>
                <li>• 完整的 TypeScript 类型定义</li>
                <li>• 与现有API的无缝集成</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                用户体验
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li>• 乐观 UI 更新，即时反馈</li>
                <li>• 智能错误提示和处理</li>
                <li>• 多种内容类型的统一处理流程</li>
                <li>• 无缝的后台处理通知</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
          <div className="text-blue-700 space-y-2">
            <p>
              • <strong>文本输入：</strong>
              直接输入或粘贴文本，系统将自动分析内容类型
            </p>
            <p>
              • <strong>链接处理：</strong>粘贴 URL
              将自动识别为链接类型，支持批量处理
            </p>
            <p>
              • <strong>文件上传：</strong>
              拖拽文件到上传区域，或点击选择文件按钮
            </p>
            <p>
              • <strong>研究模式：</strong>
              输入问题或研究主题时会自动显示研究选项
            </p>
            <p>
              • <strong>快捷键：</strong>⌘+Enter 快速添加，⌘+⇧+Enter 深度研究
            </p>
          </div>
        </div>
      </div>

      {/* 优化的添加内容对话框 */}
      <OptimizedAddContentDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
