"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Filter, FilterX, Search, XCircle, Check } from "lucide-react";
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
import { useClickOutside } from "@/hooks/use-click-outside";
import type { ContentItemPublic } from "../types";

export type SortOption = "time" | "rating" | "title" | "views";

interface LibraryHeaderProps {
  items: ContentItemPublic[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onClearFilters: () => void;
}

export const LibraryHeader = ({
  items,
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagToggle,
  sortBy,
  onSortChange,
  onClearFilters,
}: LibraryHeaderProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useClickOutside(searchContainerRef, () => {
    if (isSearching) {
      setIsSearching(false);
    }
  });

  const allTags = Array.from(
    new Set(
      items.flatMap((item) => item.ai_result?.labels || []).filter(Boolean),
    ),
  ).sort();

  const sortOptions = [
    { value: "time" as const, label: "最新" },
    { value: "rating" as const, label: "评分" },
    { value: "title" as const, label: "标题" },
    { value: "views" as const, label: "热度" },
  ];

  const isFiltered = selectedTags.length > 0 || sortBy !== "time";

  const handleSearchClick = () => {
    setIsSearching(true);
  };

  return (
    <div ref={searchContainerRef} className="flex items-center justify-end gap-1">
      {/* Filter Button */}
      <motion.div
        animate={{
          width: isSearching ? 0 : "auto",
          opacity: isSearching ? 0 : 1,
        }}
        transition={{ duration: 0.2, ease: "linear" }}
        className="overflow-hidden"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="filter"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-neutral-700 hover:bg-neutral-200/50"
            >
              {isFiltered ? <FilterX className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>排序方式</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onSortChange(option.value)}
              >
                {option.label}
                {sortBy === option.value && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>按标签筛选</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {allTags.map((tag) => (
              <DropdownMenuItem key={tag} onClick={() => onTagToggle(tag)}>
                {tag}
                {selectedTags.includes(tag) && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            {isFiltered && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClearFilters}>
                  清除筛选
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Search Component - Stable DOM */}
      <div className="relative flex items-center">
        {/* Search Icon Button - always in DOM */}
        <Button
          aria-label="search"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-neutral-700 hover:bg-neutral-200/50"
          onClick={handleSearchClick}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Search Input - always in DOM, animated with motion */}
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          initial={false}
          animate={{
            width: isSearching ? 360 : 40,
            opacity: isSearching ? 1 : 0,
            transition: { duration: 0.2, ease: "linear", delay: isSearching ? 0.12 : 0 },
          }}
          style={{ pointerEvents: isSearching ? "auto" : "none" }}
        >
          <div className="relative h-full w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="搜索..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-8 h-9 w-full bg-white rounded-md border border-neutral-200 focus:shadow-macos-window focus:border-macos-container focus:ring-0"
              autoFocus={isSearching}
            />
            <Button
                aria-label="close-search"
                variant="link"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-auto w-auto p-1 hidden"
                onClick={() => setIsSearching(false)}
              >
                <XCircle className="h-4 w-4 text-neutral-400 hover:text-neutral-600" />
              </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
