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
import { Loading } from "@/components/ui/loading";

export default function ContentLibraryPage() {
  const router = useRouter();
  const { authLoading, loading, error, items, prefetchContent, refreshItems } =
    useContentItems();

  const [selectedItem, setSelectedItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [hoveredItem, setHoveredItem] = useState<ContentItemPublic | null>(
    null,
  );

  // 过滤逻辑
  const filteredItems = items;

  // 处理卡片点击 - 立即跳转到阅读器
  const handleCardClick = useCallback(
    (item: ContentItemPublic, event?: React.MouseEvent) => {
      // 阻止事件冒泡，避免与其他交互元素冲突
      if (
        event?.target instanceof HTMLElement &&
        (event.target.closest("button") ||
          event.target.closest('[role="switch"]') ||
          event.target.closest("[data-dropdown-trigger]") ||
          event.target.closest(".dropdown-menu-trigger"))
      ) {
        return;
      }
      
      // 立即跳转，给用户即时反馈
      router.push(`/content-library/reader/${item.id}`);
      
      // 异步预取内容，提升用户体验
      Promise.resolve().then(() => {
        prefetchContent(item);
      });
    },
    [router, prefetchContent],
  );

  // 处理悬浮事件
  const handleCardHover = useCallback(
    (item: ContentItemPublic | null) => {
      setHoveredItem(item);
      if (item) {
        // 将悬浮的项目设为选中项，提供更直观的体验
        setSelectedItem(item);
        // 预取内容
        prefetchContent(item);
      }
    },
    [prefetchContent],
  );

  // 处理内容项删除
  const handleItemDeleted = useCallback((itemId: string) => {
    // 如果删除的是当前选中或悬浮的项目，清除选择
    setSelectedItem(prev => prev?.id === itemId ? null : prev);
    setHoveredItem(prev => prev?.id === itemId ? null : prev);
    // 刷新列表
    refreshItems();
  }, [refreshItems]);

  // 处理内容项更新
  const handleItemUpdated = useCallback((updatedItem: ContentItemPublic) => {
    // 如果更新的是当前选中的项目，更新选中项
    setSelectedItem(prev => prev?.id === updatedItem.id ? updatedItem : prev);
    setHoveredItem(prev => prev?.id === updatedItem.id ? updatedItem : prev);
    // 刷新列表
    refreshItems();
  }, [refreshItems]);

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
      <div className="flex h-full bg-gradient-to-br from-background via-background to-muted/20">
        <section className="flex flex-col overflow-y-auto no-scrollbar px-6 w-library flex-none 2xl:w-library-lg">
          {/* Header 仅存在于左栏 */}
          <header className="flex items-center h-header px-2 md:px-6 border-b shrink-0 bg-background/80">
            <h1 className="text-base font-medium">Library</h1>
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
                onItemDeleted={handleItemDeleted}
                onItemUpdated={handleItemUpdated}
              />
            )}
          </div>
        </section>

        {/* 右栏：剩余空间自适应 */}
        <aside className="flex-1 pr-2 py-2 pl-0 flex h-full ">
          <div className="flex-1">
            <ContentPreview item={previewItem} />
          </div>
        </aside>
      </div>
    </MainLayout>
  );
}
