"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Heart, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFavoritesList } from "@/lib/hooks/useFavorites";
import { FavoritePreview } from "./components/FavoritePreview";
import { FavoriteToolbar } from "./components/FavoriteToolbar";
import { FavoriteList } from "./components/FavoriteList";
import { filterAndSortFavorites } from "./utils/filtering";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

interface FavoriteItemData {
  id: string;
  content_item: {
    id: string;
    title?: string;
    type: string;
    source_uri?: string;
    summary?: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
    ai_result?: {
      content_quality_score?: number;
      labels?: string[];
      brief_description?: string;
      reading_time_minutes?: number;
    };
  };
  created_at: string;
}

interface FilterOptions {
  search: string;
  selectedTags: string[];
  sortBy: "time" | "rating" | "title" | "content_time";
}

// 骨架屏组件
function FavoritesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-black/6 bg-white">
          <CardContent className="p-4 pl-1">
            <div className="flex items-start gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function FavoritesPage() {
  const router = useRouter();
  const { data, isLoading, error, mutate } = useFavoritesList();

  const [selectedItem, setSelectedItem] = useState<FavoriteItemData | null>(
    null,
  );
  const [hoveredItem, setHoveredItem] = useState<FavoriteItemData | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    selectedTags: [],
    sortBy: "time",
  });

  // 应用筛选和排序
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return filterAndSortFavorites(data.items as FavoriteItemData[], filters);
  }, [data?.items, filters]);

  // 处理筛选条件变化
  const handleFiltersChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    // 清除选中项，避免筛选后显示不匹配的预览
    setSelectedItem(null);
    setHoveredItem(null);
  }, []);

  // 处理卡片点击 - 跳转到内容阅读器
  const handleCardClick = useCallback(
    (item: FavoriteItemData, event?: React.MouseEvent) => {
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

      // 跳转到内容阅读器
      router.push(`/content-library/reader/${item.content_item.id}`);
    },
    [router],
  );

  // 处理悬浮事件
  const handleCardHover = useCallback((item: FavoriteItemData | null) => {
    setHoveredItem(item);
    if (item) {
      // 将悬浮的项目设为选中项，提供更直观的体验
      setSelectedItem(item);
    }
  }, []);

  // 处理收藏项删除
  const handleItemDeleted = useCallback(
    (itemId: string) => {
      // 如果删除的是当前选中或悬浮的项目，清除选择
      setSelectedItem((prev) => (prev?.id === itemId ? null : prev));
      setHoveredItem((prev) => (prev?.id === itemId ? null : prev));
      // 刷新列表
      mutate();
    },
    [mutate],
  );

  // 获取要在预览中显示的项目（优先显示悬浮的，其次显示选中的）
  const previewItem = hoveredItem || selectedItem;

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Heart className="h-4 w-4" />
          <AlertTitle>加载收藏失败</AlertTitle>
          <AlertDescription>请稍后重试</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    /* 页面主体：左右两栏 */
    <div className="flex h-screen overflow-visible bg-gradient-to-br from-background via-background to-muted/20">
      {/* 左栏：收藏列表 - 固定宽度 */}
      <section className="flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar w-library flex-none 2xl:w-library-lg">
        {/* Header */}
        <header className="flex items-center h-header px-4 md:px-6 border-b shrink-0 bg-background/80">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-amber-500" />
            <PageHeader breadcrumbs={[{ label: "我的收藏" }]} />
            {data && (
              <span className="text-sm text-muted-foreground ml-2">
                共 {data.total} 项
              </span>
            )}
          </div>
        </header>

        {/* 工具栏 */}
        <FavoriteToolbar
          items={(data?.items as FavoriteItemData[]) || []}
          onFiltersChange={handleFiltersChange}
        />

        {/* 内容列表 */}
        <div className="flex-1 px-4 md:px-6 pb-6 pt-6">
          {isLoading ? (
            <FavoritesSkeleton />
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              {data?.items.length === 0 ? (
                <Card className="border-black/6 bg-white">
                  <CardContent className="py-12">
                    <Heart className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">暂无收藏</h3>
                    <p className="text-muted-foreground mb-6">
                      开始收藏你感兴趣的内容吧
                    </p>
                    <Button asChild>
                      <a href="/content-library">
                        <BookOpen className="mr-2 h-4 w-4" />
                        浏览内容库
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">未找到匹配的收藏内容</p>
                  <p className="text-sm text-muted-foreground">
                    尝试调整搜索条件或清除筛选
                  </p>
                </div>
              )}
            </div>
          ) : (
            <FavoriteList
              items={filteredItems}
              selectedItem={selectedItem}
              hoveredItem={hoveredItem}
              onCardClick={handleCardClick}
              onCardHover={handleCardHover}
              onItemDeleted={handleItemDeleted}
            />
          )}
        </div>
      </section>

      {/* 右栏：预览面板 - 剩余空间自适应 */}
      <aside className="flex-1 pr-2 py-2 pl-0 flex h-full">
        <div className="flex-1">
          <FavoritePreview item={previewItem} />
        </div>
      </aside>
    </div>
  );
}
