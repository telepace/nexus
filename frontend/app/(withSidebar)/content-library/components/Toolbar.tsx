"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { ContentItemPublic } from "../types";

export type ViewMode = "grid" | "list";
export type SortOption = "time" | "rating" | "title" | "views";

interface FilterOptions {
  search: string;
  selectedTags: string[];
  sortBy: SortOption;
  viewMode: ViewMode;
}

interface Props {
  items: ContentItemPublic[];
  onFiltersChange: (filters: FilterOptions) => void;
}

export const Toolbar = ({ items, onFiltersChange }: Props) => {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [viewMode] = useState<ViewMode>("grid");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // 从所有内容项中提取唯一标签
  const allTags = Array.from(
    new Set(
      items.flatMap((item) => item.ai_result?.labels || []).filter(Boolean),
    ),
  ).sort();

  // 计算每个标签的使用次数
  const tagCounts = allTags.reduce(
    (acc, tag) => {
      acc[tag] = items.filter((item) =>
        item.ai_result?.labels?.includes(tag),
      ).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  // 当筛选条件变化时通知父组件
  useEffect(() => {
    onFiltersChange({
      search,
      selectedTags,
      sortBy,
      viewMode,
    });
  }, [search, selectedTags, sortBy, viewMode, onFiltersChange]);

  // 处理标签选择
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // 清除所有筛选条件
  const clearFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setSortBy("time");
  };

  // 排序选项配置
  const sortOptions = [
    { value: "time" as const, label: "最新" },
    { value: "rating" as const, label: "评分" },
    { value: "title" as const, label: "标题" },
    { value: "views" as const, label: "热度" },
  ];

  return (
    <div className="bg-transparent backdrop-blur-sm">
      <div className="px-6 py-4">
        {/* 单行布局：筛选 + 搜索 + 控制按钮 */}
        <div className="flex items-center gap-4">
          {/* 左侧：标签筛选 */}
          <div className="flex items-center gap-3 shrink-0">
            <DropdownMenu
              open={showFilterDropdown}
              onOpenChange={setShowFilterDropdown}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 flex items-center gap-2 border-neutral-200 text-neutral-700 bg-transparent hover:bg-transparent"
                >
                  <Filter className="h-4 w-4" />
                  {selectedTags.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 px-2 text-xs bg-neutral-100 text-neutral-700"
                    >
                      {selectedTags.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-80 bg-white border-neutral-200 shadow-lg"
              >
                {/* 排序方式 */}
                <DropdownMenuLabel className="text-neutral-900 font-medium">
                  排序方式
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-100" />
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`text-neutral-700 hover:bg-neutral-50 ${
                      sortBy === option.value ? "bg-neutral-50 font-medium" : ""
                    }`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-neutral-100" />

                {/* 按标签筛选 */}
                <DropdownMenuLabel className="flex items-center gap-2 text-neutral-900 font-medium">
                  <Tag className="h-4 w-4" />
                  按标签筛选
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-100" />

                {allTags.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-neutral-500">
                    暂无可用标签
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {allTags.map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        className="flex items-center justify-between cursor-pointer text-neutral-700 hover:bg-neutral-50"
                        onClick={() => handleTagToggle(tag)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              selectedTags.includes(tag)
                                ? "bg-neutral-900"
                                : "bg-neutral-300"
                            }`}
                          />
                          <span className="truncate">{tag}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs border-neutral-200 text-neutral-600"
                        >
                          {tagCounts[tag]}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}

                {selectedTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator className="bg-neutral-100" />
                    <DropdownMenuItem
                      onClick={clearFilters}
                      className="text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700"
                    >
                      清除所有筛选
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 已选择的标签 - 紧凑显示 */}
            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2 max-w-48 overflow-x-auto">
                {selectedTags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="shrink-0 cursor-pointer bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs border border-neutral-200"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1.5 hover:bg-transparent text-neutral-500 hover:text-neutral-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTagToggle(tag);
                      }}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
                {selectedTags.length > 2 && (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-xs border-neutral-200 text-neutral-500"
                  >
                    +{selectedTags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 中间：搜索框 */}
          <div className="flex-1 relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="搜索内容..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 border-neutral-200 bg-transparent focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200"
            />
          </div>

          {/* 右侧：结果计数 */}
          <div className="text-sm text-neutral-500 shrink-0">
            {items.length} 项内容
          </div>
        </div>
      </div>
    </div>
  );
};
