"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Tag, Grid3X3, List } from "lucide-react";
import { type TagData } from "@/components/actions/prompts-action";

export function SearchForm({ tags }: { tags: TagData[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 初始化状态
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("query") || "",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get("tags") ? searchParams.get("tags")!.split(",") : [],
  );
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState(
    searchParams.get("sort") || "updated_at",
  );

  const sortOptions = [
    { id: "updated_at", name: "最新更新" },
    { id: "created_at", name: "最新创建" },
    { id: "name", name: "按名称" },
  ];

  // 处理搜索表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 构建查询参数
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));

    // 保留排序参数
    const sort = searchParams.get("sort");
    const order = searchParams.get("order");
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);

    // 更新URL并导航
    router.push(`/prompts?${params.toString()}`);
  };

  // 处理标签选择/取消
  const toggleTag = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    setSelectedTags(newSelectedTags);

    // 立即更新URL
    const params = new URLSearchParams(searchParams.toString());
    if (newSelectedTags.length > 0) {
      params.set("tags", newSelectedTags.join(","));
    } else {
      params.delete("tags");
    }
    router.push(`/prompts?${params.toString()}`);
  };

  // 清除所有过滤条件
  const clearAllTags = () => {
    setSelectedTags([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    router.push(`/prompts?${params.toString()}`);
  };

  // 查找选中标签的完整信息
  const selectedTagsInfo = tags.filter((tag) => selectedTags.includes(tag.id));
  const allTags = [...new Set(tags)];

  return (
    <div className="space-y-4">
      {/* Main Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit(e);
                }
              }}
              className="pl-10 pr-4 py-2.5 w-72 border-0 bg-slate-100/60 rounded-full text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 focus:shadow-lg transition-all duration-200 text-sm hover:bg-slate-100/80"
            />
          </div>

          {/* Tag Filter */}
          <button
            onClick={() => setShowTagFilter(!showTagFilter)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-full border transition-all duration-200 text-sm font-medium ${
              selectedTags.length > 0 || showTagFilter
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Tags</span>
            {selectedTags.length > 0 && (
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-xs">
                {selectedTags.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              const params = new URLSearchParams(searchParams.toString());
              params.set("sort", e.target.value);
              router.push(`/prompts?${params.toString()}`);
            }}
            className="appearance-none bg-white/60 border border-slate-200 rounded-full px-3 py-2.5 pr-8 text-sm text-slate-700 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all duration-200"
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex bg-white border border-slate-200 rounded-full overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 transition-colors duration-200 ${
                viewMode === "grid"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 transition-colors duration-200 ${
                viewMode === "list"
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tag Filter Panel */}
      {showTagFilter && (
        <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-900">
              Filter by Tags
            </h3>
            {selectedTags.length > 0 && (
              <button
                onClick={clearAllTags}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                  selectedTags.includes(tag.id)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filtered by:</span>
          <div className="flex items-center gap-2">
            {selectedTagsInfo.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-white rounded-full text-sm"
              >
                {tag.name}
                <button
                  onClick={() => toggleTag(tag.id)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
