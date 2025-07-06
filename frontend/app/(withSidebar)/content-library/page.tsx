"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ContentList } from "./components/ContentList";
import { ContentPreview } from "./components/ContentPreview";
import { Toolbar } from "./components/Toolbar";
import { useContentItems } from "./hooks/useContentItems";
import type { ContentItemPublic } from "./types";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { filterAndSortItems } from "./utils/filtering";
import { useAuth } from "@/lib/client-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

interface FilterOptions {
  search: string;
  selectedTags: string[];
  sortBy: "time" | "rating" | "title" | "views";
  viewMode: "grid" | "list";
}

export default function ContentLibraryPage() {
  const router = useRouter();
  const { authLoading, loading, error, items, prefetchContent, refreshItems } =
    useContentItems();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [selectedItem, setSelectedItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [hoveredItem, setHoveredItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    selectedTags: [],
    sortBy: "time",
    viewMode: "grid",
  });

  // 移动端右侧面板控制
  const [showPreview, setShowPreview] = useState(!isMobile);

  // 响应移动端变化
  useEffect(() => {
    if (isMobile) {
      setShowPreview(false);
    } else {
      setShowPreview(true);
    }
  }, [isMobile]);

  // 切换预览面板
  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  // 应用筛选和排序
  const filteredItems = useMemo(() => {
    return filterAndSortItems(items, filters);
  }, [items, filters]);

  // 处理筛选条件变化
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    // 清除选中项，避免筛选后显示不匹配的预览
    setSelectedItem(null);
    setHoveredItem(null);
  }, []);

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

      // 在移动端，先设置选中项并显示预览
      if (isMobile) {
        setSelectedItem(item);
        setShowPreview(true);
        return;
      }

      // 桌面端立即跳转
      router.push(`/content-library/reader/${item.id}`);

      // 异步预取内容，提升用户体验
      Promise.resolve().then(() => {
        prefetchContent(item);
      });
    },
    [router, prefetchContent, isMobile],
  );

  // 处理悬浮事件
  const handleCardHover = useCallback(
    (item: ContentItemPublic | null) => {
      // 移动端不使用悬浮效果
      if (isMobile) return;

      setHoveredItem(item);
      if (item) {
        // 将悬浮的项目设为选中项，提供更直观的体验
        setSelectedItem(item);
        // 预取内容
        prefetchContent(item);
      }
    },
    [prefetchContent, isMobile],
  );

  // 处理内容项删除
  const handleItemDeleted = useCallback(
    (itemId: string) => {
      // 如果删除的是当前选中或悬浮的项目，清除选择
      setSelectedItem((prev) => (prev?.id === itemId ? null : prev));
      setHoveredItem((prev) => (prev?.id === itemId ? null : prev));
      // 刷新列表
      refreshItems();
    },
    [refreshItems],
  );

  // 处理内容项更新
  const handleItemUpdated = useCallback(
    (updatedItem: ContentItemPublic) => {
      // 如果更新的是当前选中的项目，更新选中项
      setSelectedItem((prev) =>
        prev?.id === updatedItem.id ? updatedItem : prev,
      );
      setHoveredItem((prev) =>
        prev?.id === updatedItem.id ? updatedItem : prev,
      );
      // 刷新列表
      refreshItems();
    },
    [refreshItems],
  );

  // 获取要在预览中显示的项目（优先显示悬浮的，其次显示选中的）
  const previewItem = hoveredItem || selectedItem;

  // Loading states
  if (authLoading || loading) {
    return <Loading />;
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    /* 页面主体：响应式布局 */
    <div className="flex h-screen overflow-visible bg-gradient-to-br from-background via-background to-muted/20">
      {/* 左栏：内容列表 */}
      <section
        className={`flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300 ${
          isMobile
            ? showPreview
              ? "hidden"
              : "w-full"
            : showPreview
              ? "w-library flex-none 2xl:w-library-lg 3xl:w-library-xl"
              : "w-full"
        }`}
      >
        {/* Header */}
        <header className="flex items-center justify-between h-header px-6 border-b  shrink-0 bg-transparent">
          <h1 className="text-lg font-semibold text-neutral-900">Library</h1>
        </header>

        {/* 工具栏 */}
        <Toolbar items={items} onFiltersChange={handleFiltersChange} />

        {/* 列表 */}
        <div className="flex-1 px-6 pb-8 pt-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              {filters.search || filters.selectedTags.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-neutral-600 font-medium">
                    未找到匹配的内容
                  </p>
                  <p className="text-sm text-neutral-500">
                    尝试调整搜索条件或清除筛选
                  </p>
                </div>
              ) : (
                <p className="text-neutral-600 font-medium">暂无内容</p>
              )}
            </div>
          ) : (
            <ContentList
              items={filteredItems}
              selectedItem={selectedItem}
              hoveredItem={hoveredItem}
              viewMode={filters.viewMode}
              onCardClick={handleCardClick}
              onCardHover={handleCardHover}
              prefetchContent={prefetchContent}
              onItemDeleted={handleItemDeleted}
              onItemUpdated={handleItemUpdated}
            />
          )}
        </div>
      </section>

      {/* 右栏：内容预览 */}
      {showPreview && (
        isMobile ? (
          // —— 移动端：保留折叠逻辑 + Header ——
          <section
            className="flex flex-col h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300 pl-0 pr-2 py-2"
          >
            <header className="flex items-center justify-between h-header px-6 border-b border-border/30 bg-background/80 backdrop-blur-sm">
              <h2 className="text-lg font-semibold">预览</h2>
              <div className="flex items-center gap-3">
                {previewItem && (
                  <Button
                    onClick={() => router.push(`/content-library/reader/${previewItem.id}`)}
                    size="sm"
                    variant="outline"
                  >
                    打开
                  </Button>
                )}
                <Button
                  onClick={togglePreview}
                  size="sm"
                  variant="ghost"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-auto">
              <ContentPreview item={previewItem} />
            </div>
          </section>
        ) : (
          // —— 桌面端：恢复旧版 aside 结构 ——
          <aside className="flex-1 pl-0 pr-2 py-2 flex h-full">
            <div className="flex-1 min-w-0">
              <ContentPreview item={previewItem} />
            </div>
          </aside>
        )
      )}

      {/* 移动端预览切换按钮 */}
      {isMobile && !showPreview && selectedItem && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={togglePreview}
            size="sm"
            className="rounded-full shadow-lg bg-neutral-900 hover:bg-neutral-800 text-white h-12 w-12"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
