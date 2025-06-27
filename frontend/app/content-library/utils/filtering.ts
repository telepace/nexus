import type { ContentItemPublic } from "../types";
import type { SortOption } from "../components/Toolbar";

interface FilterOptions {
  search: string;
  selectedTags: string[];
  sortBy: SortOption;
}

// 搜索匹配函数
export const matchesSearch = (item: ContentItemPublic, searchQuery: string): boolean => {
  if (!searchQuery.trim()) return true;
  
  const query = searchQuery.toLowerCase().trim();
  const title = (item.title || "").toLowerCase();
  const description = (item.ai_result?.brief_description || item.summary || "").toLowerCase();
  const labels = (item.ai_result?.labels || []).map(label => label.toLowerCase());
  
  return (
    title.includes(query) ||
    description.includes(query) ||
    labels.some(label => label.includes(query))
  );
};

// 标签匹配函数
export const matchesTags = (item: ContentItemPublic, selectedTags: string[]): boolean => {
  if (selectedTags.length === 0) return true;
  
  const itemTags = item.ai_result?.labels || [];
  return selectedTags.every(tag => itemTags.includes(tag));
};

// 排序函数
export const sortItems = (items: ContentItemPublic[], sortBy: SortOption): ContentItemPublic[] => {
  const sortedItems = [...items];
  
  switch (sortBy) {
    case "time":
      return sortedItems.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
    case "rating":
      return sortedItems.sort((a, b) => {
        const ratingA = a.ai_result?.content_quality_score || 0;
        const ratingB = b.ai_result?.content_quality_score || 0;
        return ratingB - ratingA;
      });
      
    case "title":
      return sortedItems.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        return titleA.localeCompare(titleB, 'zh-CN');
      });
      
    case "views":
      // 目前没有浏览量数据，可以根据阅读时间或其他指标排序
      return sortedItems.sort((a, b) => {
        const timeA = a.ai_result?.reading_time_minutes || 0;
        const timeB = b.ai_result?.reading_time_minutes || 0;
        return timeB - timeA;
      });
      
    default:
      return sortedItems;
  }
};

// 主筛选函数
export const filterAndSortItems = (
  items: ContentItemPublic[],
  filters: FilterOptions
): ContentItemPublic[] => {
  let filteredItems = items;
  
  // 应用搜索筛选
  if (filters.search.trim()) {
    filteredItems = filteredItems.filter(item => matchesSearch(item, filters.search));
  }
  
  // 应用标签筛选
  if (filters.selectedTags.length > 0) {
    filteredItems = filteredItems.filter(item => matchesTags(item, filters.selectedTags));
  }
  
  // 应用排序
  return sortItems(filteredItems, filters.sortBy);
}; 