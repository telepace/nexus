"use client";

import { useState } from "react";
import { AddContentModal } from "@/components/layout/AddContentModal";
import OptimizedAddContentDialog from "@/components/layout/OptimizedAddContentDialog";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, ArrowRight, Zap } from "lucide-react";

export default function TestAddContentComparisonPage() {
  const [optimizedOpen, setOptimizedOpen] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            添加内容组件设计对比
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            基于参考设计风格优化重构的上传文档逻辑对比演示
          </p>
        </div>

        {/* 对比区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* 优化版本 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                优化重构版本
              </h2>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                NEW
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>固定尺寸容器，避免界面跳动</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>智能内容分析和类型检测</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>统一的视觉语言和配色</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>优化的交互流程和快捷键</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>研究模式智能识别</span>
              </div>
            </div>

            <Button
              onClick={() => setOptimizedOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              体验优化版本
            </Button>
          </div>

          {/* 原始版本 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">原始版本</h2>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                ORIGINAL
              </span>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>基于 shadcn/ui 组件库</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>AlertDialog 模态框实现</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>基础的文件拖拽功能</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>简单的内容类型检测</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>切换视图模式</span>
              </div>
            </div>

            <Button
              onClick={() => setOriginalOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              查看原始版本
            </Button>
          </div>
        </div>

        {/* 设计改进点 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            主要设计改进点
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">视觉设计</h3>
              </div>
              <ul className="space-y-1 text-sm text-gray-600 pl-7">
                <li>• 极简基础组件，减少依赖</li>
                <li>• 固定尺寸容器避免跳动</li>
                <li>• 统一的圆角和间距规范</li>
                <li>• 柔和的阴影和背景色</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">智能分析</h3>
              </div>
              <ul className="space-y-1 text-sm text-gray-600 pl-7">
                <li>• 增强的内容类型检测</li>
                <li>• 研究模式智能识别</li>
                <li>• 文件类型图标映射</li>
                <li>• 实时内容分析提示</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">交互优化</h3>
              </div>
              <ul className="space-y-1 text-sm text-gray-600 pl-7">
                <li>• 优化的快捷键支持</li>
                <li>• 流畅的拖拽体验</li>
                <li>• 智能的粘贴处理</li>
                <li>• 一体化的操作流程</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 技术实现对比 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">技术实现对比</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">
                    特性
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-green-600">
                    优化版本
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-blue-600">
                    原始版本
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    基础组件
                  </td>
                  <td className="py-3 px-4 text-gray-600">自定义极简组件</td>
                  <td className="py-3 px-4 text-gray-600">shadcn/ui 组件库</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    布局结构
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    固定高度，避免跳动
                  </td>
                  <td className="py-3 px-4 text-gray-600">响应式高度</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    内容分析
                  </td>
                  <td className="py-3 px-4 text-gray-600">智能多类型检测</td>
                  <td className="py-3 px-4 text-gray-600">基础URL检测</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    文件处理
                  </td>
                  <td className="py-3 px-4 text-gray-600">类型图标映射</td>
                  <td className="py-3 px-4 text-gray-600">统一文件图标</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    快捷键
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    ⌘+Enter / ⌘+⇧+Enter
                  </td>
                  <td className="py-3 px-4 text-gray-600">⌘+Enter</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 对话框组件 */}
      <AddContentModal
        open={optimizedOpen}
        onClose={() => setOptimizedOpen(false)}
      />

      <OptimizedAddContentDialog
        open={originalOpen}
        onClose={() => setOriginalOpen(false)}
      />
    </div>
  );
}
