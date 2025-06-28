"use client";

import type { ContentItemPublic } from "../types";
import { ContentCard, ViewMode } from "./ContentCard";
import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  items: ContentItemPublic[];
  selectedItem: ContentItemPublic | null;
  hoveredItem: ContentItemPublic | null;
  viewMode?: ViewMode;
  onCardClick: (item: ContentItemPublic, event?: React.MouseEvent) => void;
  onCardHover: (item: ContentItemPublic | null) => void;
  prefetchContent: (item: ContentItemPublic) => void;
  onItemDeleted?: (itemId: string) => void;
  onItemUpdated?: (item: ContentItemPublic) => void;
}

export const ContentList = ({
  items,
  selectedItem,
  hoveredItem,
  viewMode = "grid",
  onCardClick,
  onCardHover,
  prefetchContent,
  onItemDeleted,
  onItemUpdated,
}: Props) => {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        viewMode === "grid"
          ? "grid grid-cols-1 gap-4 max-w-2xl mx-auto"
          : "space-y-0",
      )}
    >
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          selected={selectedItem?.id === item.id}
          hovered={hoveredItem?.id === item.id}
          viewMode={viewMode}
          onCardClick={onCardClick}
          onCardHover={onCardHover}
          prefetchContent={prefetchContent}
          onItemDeleted={onItemDeleted}
          onItemUpdated={onItemUpdated}
        />
      ))}
    </div>
  );
};
