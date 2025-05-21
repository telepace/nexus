'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { type TagData } from '@/components/actions/prompts-action';

export function SearchForm({ tags }: { tags: TagData[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 初始化状态
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags') ? searchParams.get('tags')!.split(',') : []
  );
  
  // 处理搜索表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 构建查询参数
    const params = new URLSearchParams();
    if (searchQuery) params.set('query', searchQuery);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    
    // 保留排序参数
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);
    
    // 更新URL并导航
    router.push(`/prompts?${params.toString()}`);
  };
  
  // 处理标签选择/取消
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };
  
  // 清除所有过滤条件
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    
    // 保留排序参数
    const params = new URLSearchParams();
    const sort = searchParams.get('sort');
    const order = searchParams.get('order');
    if (sort) params.set('sort', sort);
    if (order) params.set('order', order);
    
    router.push(`/prompts${params.toString() ? `?${params.toString()}` : ''}`);
  };
  
  // 查找选中标签的完整信息
  const selectedTagsInfo = tags.filter(tag => selectedTags.includes(tag.id));
  
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索提示词..."
            className="pl-8"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" type="button">
              标签筛选 {selectedTags.length > 0 && `(${selectedTags.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>选择标签</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tags.length === 0 ? (
              <DropdownMenuItem disabled>无可用标签</DropdownMenuItem>
            ) : (
              tags.map(tag => (
                <DropdownMenuItem
                  key={tag.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleTag(tag.id);
                  }}
                  className="flex items-center justify-between"
                >
                  <span>{tag.name}</span>
                  {selectedTags.includes(tag.id) && <span>✓</span>}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button type="submit">搜索</Button>
      </form>
      
      {/* 已选过滤条件展示 */}
      {(searchQuery || selectedTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">当前筛选:</span>
          
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <span>关键词: {searchQuery}</span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  setSearchQuery('');
                  
                  // 更新URL
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete('query');
                  router.push(`/prompts?${params.toString()}`);
                }}
              />
            </Badge>
          )}
          
          {selectedTagsInfo.map(tag => (
            <Badge 
              key={tag.id}
              variant="secondary" 
              className="flex items-center gap-1"
              style={{ backgroundColor: `${tag.color}20` || '#f3f3f3' }}
            >
              <span>{tag.name}</span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => {
                  toggleTag(tag.id);
                  
                  // 更新URL
                  const newSelectedTags = selectedTags.filter(id => id !== tag.id);
                  const params = new URLSearchParams(searchParams.toString());
                  
                  if (newSelectedTags.length > 0) {
                    params.set('tags', newSelectedTags.join(','));
                  } else {
                    params.delete('tags');
                  }
                  
                  router.push(`/prompts?${params.toString()}`);
                }}
              />
            </Badge>
          ))}
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={clearAllFilters}
          >
            清除全部
          </Button>
        </div>
      )}
    </div>
  );
} 