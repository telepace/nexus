"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  X, 
  Filter
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [isTagsOpen, setIsTagsOpen] = useState(false);

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
  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);

    // 保留排序参数
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    const order = searchParams.get("order");
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);

    router.push(`/prompts${params.toString() ? `?${params.toString()}` : ""}`);
  };

  // 清除搜索关键词
  const clearSearch = () => {
    setSearchQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("query");
    router.push(`/prompts?${params.toString()}`);
  };

  // 查找选中标签的完整信息
  const selectedTagsInfo = tags.filter((tag) => selectedTags.includes(tag.id));

  return (
    <div className="space-y-4">
      {/* 主搜索和操作区域 */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* 搜索栏和主要操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 搜索输入 */}
            <form onSubmit={handleSubmit} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground transform -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder="搜索提示词名称、描述..."
                  className="pl-10 pr-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 p-0 transform -translate-y-1/2 hover:bg-muted"
                    onClick={clearSearch}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">清除搜索</span>
                  </Button>
                )}
              </div>
            </form>

            {/* 操作按钮组 */}
            <div className="flex gap-2">
              {/* 标签筛选 */}
              <Popover open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    标签筛选
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">选择标签</h4>
                      {selectedTags.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setSelectedTags([]);
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete("tags");
                            router.push(`/prompts?${params.toString()}`);
                          }}
                        >
                          清除全部
                        </Button>
                      )}
                    </div>
                    
                    <Separator className="mb-3" />
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {tags.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          暂无可用标签
                        </p>
                      ) : (
                        tags.map((tag) => (
                          <div
                            key={tag.id}
                            className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors
                              ${selectedTags.includes(tag.id) 
                                ? 'bg-primary/10 border border-primary/20' 
                                : 'hover:bg-muted'
                              }`}
                            onClick={() => toggleTag(tag.id)}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color || '#666' }}
                              />
                              <span className="text-sm font-medium">{tag.name}</span>
                            </div>
                            {selectedTags.includes(tag.id) && (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <X className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* 搜索按钮 */}
              <Button 
                type="submit" 
                onClick={handleSubmit}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                搜索
              </Button>
            </div>
          </div>

          {/* 已选择的筛选条件展示 */}
          {(searchQuery || selectedTags.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  当前筛选条件
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearAllFilters}
                >
                  清除全部
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* 搜索关键词 */}
                {searchQuery && (
                  <Badge 
                    variant="secondary" 
                    className="flex items-center gap-1.5 px-2.5 py-1"
                  >
                    <Search className="h-3 w-3" />
                    <span className="text-xs">关键词: {searchQuery}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-transparent"
                      onClick={clearSearch}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                )}

                {/* 选中的标签 */}
                {selectedTagsInfo.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 px-2.5 py-1"
                    style={{ 
                      backgroundColor: `${tag.color}15` || '#f3f3f3',
                      borderColor: `${tag.color}30` || '#e0e0e0'
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color || '#666' }}
                    />
                    <span className="text-xs">{tag.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-3 w-3 p-0 hover:bg-transparent"
                      onClick={() => toggleTag(tag.id)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
