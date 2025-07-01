"use client";

import type { ContentItemPublic } from "../types";
import { ContentCard } from "./ContentCard";
import React from "react";

interface Props {
  items: ContentItemPublic[];
  selectedItem: ContentItemPublic | null;
  hoveredItem: ContentItemPublic | null;
  viewMode?: string; // 保留这个属性但不使用，避免破坏外部调用
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
  onCardClick,
  onCardHover,
  prefetchContent,
  onItemDeleted,
  onItemUpdated,
}: Props) => {
  if (!items.length) return null;

  return (
    <div className="space-y-6 flex flex-col items-center">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          item={item}
          selected={selectedItem?.id === item.id}
          hovered={hoveredItem?.id === item.id}
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
