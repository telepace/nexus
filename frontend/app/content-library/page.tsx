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
    <MainLayout pageTitle="Content Library">
      <LibraryHeader />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* 搜索 + 过滤 */}
          <Card className="border-0 shadow-lg mb-8">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索标题或摘要..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 border-2 focus:border-primary/50"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">所有状态</option>
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">所有类型</option>
                  <option value="pdf">PDF</option>
                  <option value="url">网页</option>
                  <option value="text">文本</option>
                </select>
              </div>
              <div className="text-sm text-muted-foreground flex justify-between">
                <span>共 {items.length} 项内容</span>
                {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                  <span>筛选后显示 {filteredItems.length} 项</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 列表 */}
            <div className="lg:col-span-2">
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

            {/* 预览 */}
            <div className="lg:col-span-1">
              <ContentPreview item={selectedItem} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
