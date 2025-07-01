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

export function filterAndSortFavorites(
  items: FavoriteItemData[],
  filters: FilterOptions,
): FavoriteItemData[] {
  let filteredItems = [...items];

  // 搜索筛选
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredItems = filteredItems.filter((item) => {
      const { content_item } = item;
      return (
        content_item.title?.toLowerCase().includes(searchTerm) ||
        content_item.summary?.toLowerCase().includes(searchTerm) ||
        content_item.ai_result?.brief_description
          ?.toLowerCase()
          .includes(searchTerm) ||
        content_item.ai_result?.labels?.some((label) =>
          label.toLowerCase().includes(searchTerm),
        ) ||
        false
      );
    });
  }

  // 标签筛选
  if (filters.selectedTags.length > 0) {
    filteredItems = filteredItems.filter((item) => {
      const itemLabels = item.content_item.ai_result?.labels || [];
      return filters.selectedTags.every((tag) => itemLabels.includes(tag));
    });
  }

  // 排序
  filteredItems.sort((a, b) => {
    switch (filters.sortBy) {
      case "time":
        // 按收藏时间排序，最新的在前
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      case "content_time":
        // 按内容创建时间排序，最新的在前
        return (
          new Date(b.content_item.created_at).getTime() -
          new Date(a.content_item.created_at).getTime()
        );

      case "rating":
        // 按内容质量评分排序，高分在前
        const scoreA = a.content_item.ai_result?.content_quality_score ?? 0;
        const scoreB = b.content_item.ai_result?.content_quality_score ?? 0;
        return scoreB - scoreA;

      case "title":
        // 按标题字母顺序排序
        const titleA = a.content_item.title || "";
        const titleB = b.content_item.title || "";
        return titleA.localeCompare(titleB, "zh-CN");

      default:
        return 0;
    }
  });

  return filteredItems;
}
