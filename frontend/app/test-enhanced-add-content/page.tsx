"use client";

import { useState } from "react";
import EnhancedAddContentDialog from "@/components/layout/EnhancedAddContentDialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Zap,
  Search,
  Camera,
  Film,
  FileText,
  Globe,
  Palette,
  Layers,
  MousePointer,
  Code,
} from "lucide-react";

export default function TestEnhancedAddContentPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            最新优化版本
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            增强的添加内容组件
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            基于现代化设计语言重构的上传文档逻辑，提供更智能、更流畅的用户体验
          </p>

          {/* 触发按钮 */}
          <Button
            onClick={() => setOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            体验增强版本
          </Button>
        </div>

        {/* 核心特性展示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              智能内容分析
            </h3>
            <p className="text-gray-600 text-sm">
              更强大的内容检测算法，精准识别研究问题、链接、文档等多种类型
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              现代化设计
            </h3>
            <p className="text-gray-600 text-sm">
              圆润的边角、渐变色彩、柔和的阴影，营造更加精致的视觉体验
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
              <MousePointer className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              优化交互
            </h3>
            <p className="text-gray-600 text-sm">
              流畅的动画效果、智能的快捷键、增强的拖拽体验
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              丰富反馈
            </h3>
            <p className="text-gray-600 text-sm">
              实时的状态反馈、成功提示、详细的处理描述
            </p>
          </div>
        </div>

        {/* 设计亮点 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            设计亮点
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 视觉设计 */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  视觉优化
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">渐变色彩系统</h4>
                    <p className="text-sm text-gray-600">
                      研究按钮使用蓝色渐变，增强视觉层次
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">圆润设计语言</h4>
                    <p className="text-sm text-gray-600">
                      统一的圆角设计，营造柔和友好的界面
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">精致阴影效果</h4>
                    <p className="text-sm text-gray-600">
                      层次分明的阴影系统，提升空间感
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 交互优化 */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  交互提升
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">智能内容分析</h4>
                    <p className="text-sm text-gray-600">
                      实时检测内容类型，提供个性化提示
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">增强的快捷键</h4>
                    <p className="text-sm text-gray-600">
                      ⌘+Enter 快速添加，⌘+⇧+Enter 深度研究
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                  <div>
                    <h4 className="font-medium text-gray-900">文件类型图标</h4>
                    <p className="text-sm text-gray-600">
                      根据文件类型显示对应图标和颜色
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 内容类型演示 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            智能内容识别
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 border border-green-100 bg-green-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700">链接内容</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">试试粘贴这些内容：</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                https://example.com
              </code>
            </div>

            <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Search className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-700">研究问题</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">试试输入这些内容：</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                如何提升用户体验？
              </code>
            </div>

            <div className="p-4 border border-purple-100 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Camera className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-700">图片文件</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">拖拽文件类型：</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                .jpg, .png, .gif
              </code>
            </div>

            <div className="p-4 border border-orange-100 bg-orange-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Film className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-700">视频文件</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">支持格式：</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                .mp4, .mov, .avi
              </code>
            </div>

            <div className="p-4 border border-red-100 bg-red-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-700">文档文件</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">支持格式：</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                .pdf, .docx, .txt
              </code>
            </div>

            <div className="p-4 border border-gray-100 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-700">长文本</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">自动识别：</p>
              <code className="text-xs bg-white px-2 py-1 rounded border block">
                文章、多段落内容
              </code>
            </div>
          </div>
        </div>

        {/* 技术特性 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            技术特性
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Code className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  技术实现
                </h3>
              </div>

              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>TypeScript 完整类型定义</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>React Hooks 优化状态管理</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>原生 DOM API 事件处理</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Tailwind CSS 响应式设计</span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <Layers className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  性能优化
                </h3>
              </div>

              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>useCallback 防止重复渲染</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>事件委托减少内存占用</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>固定布局避免重排</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>懒加载和按需渲染</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-blue-900 mb-6 text-center">
            使用指南
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800">输入方式</h4>
              <ul className="space-y-2 text-blue-700 text-sm">
                <li>
                  • <strong>直接输入：</strong>在文本框中输入内容
                </li>
                <li>
                  • <strong>粘贴内容：</strong>⌘+V 粘贴文本或链接
                </li>
                <li>
                  • <strong>拖拽文件：</strong>将文件拖到上传区域
                </li>
                <li>
                  • <strong>选择文件：</strong>点击按钮选择本地文件
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-blue-800">快捷操作</h4>
              <ul className="space-y-2 text-blue-700 text-sm">
                <li>
                  • <strong>⌘+Enter：</strong>快速添加内容
                </li>
                <li>
                  • <strong>⌘+⇧+Enter：</strong>深度研究模式
                </li>
                <li>
                  • <strong>Esc：</strong>关闭对话框
                </li>
                <li>
                  • <strong>自动聚焦：</strong>打开后自动聚焦到输入框
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 增强的添加内容对话框 */}
      <EnhancedAddContentDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
