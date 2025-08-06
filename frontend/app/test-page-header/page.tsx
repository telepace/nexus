"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPageHeaderPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          PageHeader 组件测试
        </h1>

        {/* 测试单个面包屑 */}
        <Card>
          <CardHeader>
            <CardTitle>单个面包屑测试 (类似 content-library)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between h-14 px-6 border-b bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  <PageHeader breadcrumbs={[{ label: "Library" }]} />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-gray-500">
                    搜索和筛选控件位置
                  </span>
                </div>
              </div>
              <div className="p-4 text-sm text-gray-600">
                这模拟了 content-library 页面的 header 布局
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 测试多个面包屑 */}
        <Card>
          <CardHeader>
            <CardTitle>多个面包屑测试 (类似 reader 页面)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between h-14 px-6 border-b bg-white">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <PageHeader
                    breadcrumbs={[
                      { label: "Library", href: "/content-library" },
                      { label: "2024年度回顾：旅居、AI与个人成长转型" },
                    ]}
                    className="flex-1 min-w-0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">操作按钮位置</span>
                </div>
              </div>
              <div className="p-4 text-sm text-gray-600">
                这模拟了 reader 页面的 header 布局
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 测试不同颜色主题 */}
        <Card>
          <CardHeader>
            <CardTitle>不同主题测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 浅色主题 */}
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="font-medium mb-2">浅色主题</h3>
              <PageHeader breadcrumbs={[{ label: "Content Library" }]} />
            </div>

            {/* 深色主题 */}
            <div className="border rounded-lg p-4 bg-gray-900 dark">
              <h3 className="font-medium mb-2 text-white">深色主题</h3>
              <PageHeader breadcrumbs={[{ label: "Content Library" }]} />
            </div>
          </CardContent>
        </Card>

        {/* 不同尺寸测试 */}
        <Card>
          <CardHeader>
            <CardTitle>不同尺寸测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-medium mb-2">普通尺寸</h3>
              <PageHeader breadcrumbs={[{ label: "Normal Size Library" }]} />
            </div>

            <div className="border rounded-lg p-2 bg-gray-50">
              <h3 className="font-medium mb-2 text-sm">紧凑尺寸</h3>
              <PageHeader breadcrumbs={[{ label: "Compact Library" }]} />
            </div>
          </CardContent>
        </Card>

        {/* 实际布局模拟 */}
        <Card>
          <CardHeader>
            <CardTitle>实际 content-library 布局模拟</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              {/* 模拟完整的 header */}
              <div className="relative flex items-center justify-between h-14 px-6 border-b bg-white backdrop-blur-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <PageHeader breadcrumbs={[{ label: "Library" }]} />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>

              {/* 模拟内容区域 */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="w-full h-24 bg-gray-100 rounded-lg"></div>
                  <div className="w-full h-24 bg-gray-100 rounded-lg"></div>
                  <div className="w-full h-24 bg-gray-100 rounded-lg"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
