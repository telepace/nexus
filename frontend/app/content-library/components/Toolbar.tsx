"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Grid3X3, List, ChevronDown, Tag } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // 从所有内容项中提取唯一标签
  const allTags = Array.from(
    new Set(
      items
        .flatMap(item => item.ai_result?.labels || [])
        .filter(Boolean)
    )
  ).sort();

  // 计算每个标签的使用次数
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = items.filter(item => 
      item.ai_result?.labels?.includes(tag)
    ).length;
    return acc;
  }, {} as Record<string, number>);

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
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
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
    <div className="border-b bg-background/80 backdrop-blur-sm">
      <div className="px-4 md:px-6 py-3">
        {/* 单行布局：筛选 + 搜索 + 控制按钮 */}
        <div className="flex items-center gap-3">
          {/* 左侧：标签筛选 */}
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>筛选</span>
                  {selectedTags.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {selectedTags.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  按标签筛选
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {allTags.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    暂无可用标签
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {allTags.map(tag => (
                      <DropdownMenuItem
                        key={tag}
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            selectedTags.includes(tag) 
                              ? "bg-primary" 
                              : "bg-muted"
                          }`} />
                          <span className="truncate">{tag}</span>
                        </div>
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          {tagCounts[tag]}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
                
                {selectedTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearFilters}
                      className="text-muted-foreground"
                    >
                      清除所有筛选
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 已选择的标签 - 紧凑显示 */}
            {selectedTags.length > 0 && (
              <div className="flex items-center gap-1 max-w-48 overflow-x-auto">
                {selectedTags.slice(0, 2).map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="shrink-0 cursor-pointer hover:bg-secondary/80 text-xs"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1 hover:bg-transparent"
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
                  <Badge variant="outline" className="text-xs shrink-0">
                    +{selectedTags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* 中间：搜索框 - 自适应宽度 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索内容标题、描述或标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 bg-background border-input focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* 右侧：排序和视图控制 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 排序选择 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <span>{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>排序方式</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map(option => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={sortBy === option.value ? "bg-accent" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 视图切换 */}
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="h-9 px-2.5 rounded-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="h-9 px-2.5 rounded-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 