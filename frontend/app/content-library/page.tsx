"use client";

import { useState, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ContentList } from "./components/ContentList";
import { ContentPreview } from "./components/ContentPreview";
import { useContentItems } from "./hooks/useContentItems";
import type { ContentItemPublic } from "./types";
import { useRouter } from "next/navigation";

export default function ContentLibraryPage() {
  const router = useRouter();
  const {
    authLoading,
    loading,
    error,
    items,
    prefetchContent,
  } = useContentItems();

  const [selectedItem, setSelectedItem] = useState<ContentItemPublic | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ContentItemPublic | null>(null);

  // 过滤逻辑
  const filteredItems = items;

  // 处理卡片点击 - 直接跳转到阅读器
  const handleCardClick = useCallback((item: ContentItemPublic) => {
    router.push(`/content-library/reader/${item.id}`);
  }, [router]);

  // 处理悬浮事件
  const handleCardHover = useCallback((item: ContentItemPublic | null) => {
    setHoveredItem(item);
    if (item) {
      // 将悬浮的项目设为选中项，提供更直观的体验
      setSelectedItem(item);
      // 预取内容
      prefetchContent(item);
    }
  }, [prefetchContent]);

  // 获取要在预览中显示的项目（优先显示悬浮的，其次显示选中的）
  const previewItem = hoveredItem || selectedItem;

  // Loading states
  if (authLoading || loading) {
    return (
      <MainLayout pageTitle="Content Library">
        <Loading />
      </MainLayout>
    );
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
    );
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

          {/* 列表 */}
          <div className="flex-1 px-4 md:px-6 pb-6 pt-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">暂无内容</div>
            ) : (
              <ContentList
                items={filteredItems}
                selectedItem={selectedItem}
                hoveredItem={hoveredItem}
                onCardClick={handleCardClick}
                onCardHover={handleCardHover}
                prefetchContent={prefetchContent}
              />
            )}
          </div>
        </section>

        {/* 右栏：剩余空间自适应 */}
        <aside className="flex-1 pr-2 py-2 pl-0 flex h-screen overflow-visible">
          <div className="flex-1 h-full">
            <ContentPreview item={previewItem} />
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}
