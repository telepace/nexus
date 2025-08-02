"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ContentList } from "./components/ContentList";
import { ContentPreview } from "./components/ContentPreview";
import { useContentItems } from "./hooks/useContentItems";
import { type ContentItemPublic } from "./types";
import { filterAndSortItems } from "./utils/filtering";
import { LibraryHeader } from "./components/LibraryHeader";
import { type SortOption } from "./types";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { useAuth } from "@/lib/client-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { PanelRightOpen, PanelRightClose } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface FilterOptions {
  search: string;
  selectedTags: string[];
  sortBy: SortOption;
  viewMode: "grid" | "list";
}

export default function ContentLibraryPage() {
  const router = useRouter();
  const { authLoading, loading, error, items, prefetchContent, refreshItems } =
    useContentItems();
  useAuth();
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

  // 🚀 清理定时器，避免内存泄漏
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 切换预览面板
  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  // 🚀 优化筛选和排序 - 添加更细致的依赖检查
  const filteredItems = useMemo(() => {
    return filterAndSortItems(items, filters);
  }, [items, filters]);

  // 清除选中项的通用函数
  const clearSelection = () => {
    setSelectedItem(null);
    setHoveredItem(null);
  };

  // 清除预览的函数（当点击空白区域时）
  const clearPreview = useCallback(() => {
    setHoveredItem(null);
    setSelectedItem(null);
  }, []);

  // 处理筛选和排序的回调函数
  const handleSearchChange = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    clearSelection();
  };

  const handleTagToggle = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
    clearSelection();
  };

  const handleSortChange = (sortBy: SortOption) => {
    setFilters((prev) => ({ ...prev, sortBy }));
    clearSelection();
  };

  const handleViewModeChange = (viewMode: "grid" | "list") => {
    setFilters((prev) => ({ ...prev, viewMode }));
    clearSelection();
  };

  // const handleClearFilters = () => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     selectedTags: [],
  //     sortBy: "time",
  //   }));
  //   clearSelection();
  // };

  const handleCardClick = useCallback(
    (item: ContentItemPublic, event?: React.MouseEvent) => {
      if (
        event?.target instanceof HTMLElement &&
        (event.target.closest("button") ||
          event.target.closest('[role="switch"]') ||
          event.target.closest("[data-dropdown-trigger]") ||
          event.target.closest(".dropdown-menu-trigger"))
      ) {
        return;
      }

      if (isMobile) {
        setSelectedItem(item);
        setShowPreview(true);
        return;
      }

      router.push(`/content-library/reader/${item.id}`);
      Promise.resolve().then(() => prefetchContent(item));
    },
    [router, prefetchContent, isMobile],
  );

  // 🚀 优化悬浮事件处理 - 添加防抖，减少频繁更新
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleCardHover = useCallback(
    (item: ContentItemPublic | null) => {
      if (isMobile) return;
      
      // 清除之前的定时器
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      
      if (item) {
        // 防抖处理，减少频繁状态更新
        hoverTimeoutRef.current = setTimeout(() => {
          setHoveredItem(item);
          if (!selectedItem || selectedItem.id !== item.id) {
            prefetchContent(item);
          }
        }, 100); // 100ms 防抖
      }
    },
    [prefetchContent, isMobile, selectedItem],
  );

  // 处理内容项删除
  const handleItemDeleted = useCallback(
    (itemId: string) => {
      setSelectedItem((prev) => (prev?.id === itemId ? null : prev));
      setHoveredItem((prev) => (prev?.id === itemId ? null : prev));
      refreshItems();
    },
    [refreshItems],
  );

  // 处理内容项更新
  const handleItemUpdated = useCallback(
    (updatedItem: ContentItemPublic) => {
      setSelectedItem((prev) =>
        prev?.id === updatedItem.id ? updatedItem : prev,
      );
      setHoveredItem((prev) =>
        prev?.id === updatedItem.id ? updatedItem : prev,
      );
      refreshItems();
    },
    [refreshItems],
  );

  // 🚀 优化预览项目选择逻辑 - 添加稳定性检查
  const previewItem = useMemo(() => {
    if (selectedItem) {
      return selectedItem;
    }
    return hoveredItem;
  }, [selectedItem, hoveredItem]);

  if (authLoading || loading) {
    return <Loading />;
  }

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
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* 左栏：内容列表 */}
      <section
        className={`flex flex-col transition-all duration-300 ${
          isMobile
            ? showPreview
              ? "hidden"
              : "w-full"
            : showPreview
              ? "w-library flex-none 2xl:w-library-lg 3xl:w-library-xl"
              : "w-full"
        }`}
      >
        {/* Header - 固定在顶部 */}
        <header className="relative flex items-center justify-between h-header px-6 border-b shrink-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 min-w-0">
            <PageHeader breadcrumbs={[{ label: 'Library' }]} />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <LibraryHeader
              items={items}
              searchQuery={filters.search}
              onSearchChange={handleSearchChange}
              selectedTags={filters.selectedTags}
              onTagToggle={handleTagToggle}
              sortBy={filters.sortBy}
              onSortChange={handleSortChange}
              viewMode={filters.viewMode}
              onViewModeChange={handleViewModeChange}
              onClearFilters={() => {
                setFilters(prev => ({
                  ...prev,
                  selectedTags: [],
                  sortBy: "time",
                }));
                clearSelection();
              }}
            />
            {/* 移动端预览面板切换按钮 */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-2"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </header>

        {/* 列表 - 可滚动区域 */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 pb-8 pt-8"
          onClick={(e) => {
            // 只有点击空白区域时才清除预览
            if (e.target === e.currentTarget) {
              clearPreview();
            }
          }}
        >
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
      {showPreview &&
        (isMobile ? (
          <section className="flex flex-col h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300 pl-0 pr-2 py-2">
            <header className="flex items-center justify-between h-header px-6 border-b border-border/30 bg-background/80 backdrop-blur-sm">
              <h2 className="text-lg font-semibold">预览</h2>
              <div className="flex items-center gap-3">
                {previewItem && (
                  <Button
                    onClick={() =>
                      router.push(`/content-library/reader/${previewItem.id}`)
                    }
                    size="sm"
                    variant="outline"
                  >
                    打开
                  </Button>
                )}
                <Button onClick={togglePreview} size="sm" variant="ghost">
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
            </header>
            <div className="flex-1 overflow-auto">
              <ContentPreview item={previewItem} />
            </div>
          </section>
        ) : (
          <aside className="flex-1 pl-0 pr-2 py-2 flex h-full">
            <div className="flex-1 min-w-0">
              <ContentPreview item={previewItem} />
            </div>
          </aside>
        ))}

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
