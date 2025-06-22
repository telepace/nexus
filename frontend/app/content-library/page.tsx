"use client";

import MainLayout from '@/components/layout/MainLayout'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, AlertCircle, Loader2 } from 'lucide-react'
import { ContentList } from './components/ContentList'
import { ContentPreview } from './components/ContentPreview'
import { LibraryHeader } from './components/LibraryHeader'
import { useContentItems } from './hooks/useContentItems'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

export default function ContentLibraryPage() {
  const {
    authLoading,
    loading,
    error,
    items,
    filteredItems,
    selectedItem,
    setSelectedItem,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    prefetchContent,
  } = useContentItems()

  // Loading states
  if (authLoading || loading) {
    return (
      <MainLayout pageTitle="Content Library">
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-lg">Loading...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <MainLayout pageTitle="Content Library">
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </MainLayout>
    )
  }

  return (
    <MainLayout pageTitle="Content Library" fullscreen>
      {/* 页面主体：左右两栏 */}
      <div className="flex h-screen overflow-visible bg-gradient-to-br from-background via-background to-muted/20">
        {/* 左栏：>904px 固定 35.25rem，≤904px 最宽 35.25rem 可缩 */}
        <section className="flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar px-6 w-full max-w-library min-[904px]:w-library min-[904px]:flex-none">
          {/* Header 仅存在于左栏 */}
          <header className="flex items-center h-header px-2 md:px-6 border-b shrink-0 bg-background/80">
            <h1 className="text-lg font-semibold">Library</h1>
          </header>

          {/* 筛选控件（暂时隐藏） */}
          {false && (
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between px-6 pt-4 pb-2">
            {/* 搜索框 */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索标题或摘要..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* 状态筛选 */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[120px]">
                <SelectValue placeholder="所有状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>

            {/* 类型筛选 */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="min-w-[120px]">
                <SelectValue placeholder="所有类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有类型</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="url">网页</SelectItem>
                <SelectItem value="text">文本</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          {/* 列表 */}
          <div className="flex-1 px-4 md:px-6 pb-6 pt-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">暂无内容</div>
            ) : (
              <ContentList
                items={filteredItems}
                selectedItem={selectedItem}
                onSelect={setSelectedItem}
                prefetchContent={prefetchContent}
              />
            )}
          </div>
        </section>

        {/* 右栏：剩余空间自适应 */}
        <aside className="flex-1 pr-2 py-2 pl-0 flex h-screen overflow-visible">
          <div className="flex-1 h-full">
            <ContentPreview item={selectedItem} />
          </div>
        </aside>
      </div>
    </MainLayout>
  )
}
