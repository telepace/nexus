"use client";

import type { ContentItemPublic } from "./types";
import { ContentCard } from "./ContentCard";
import { Separator } from "@/components/ui/separator";
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

export const ContentList = React.memo(({
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
    <div className="space-y-4 flex flex-col items-center">
      {items.map((item, idx) => (
        <React.Fragment key={item.id}>
          <ContentCard
            item={item}
            selected={selectedItem?.id === item.id}
            hovered={hoveredItem?.id === item.id}
            onCardClick={onCardClick}
            onCardHover={onCardHover}
            prefetchContent={prefetchContent}
            onItemDeleted={onItemDeleted}
            onItemUpdated={onItemUpdated}
          />
          {idx !== items.length - 1 && (
            <Separator
              className="ml-[3.25rem]"
              style={{ width: "calc(var(--size-card-title) - 0.5rem)" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // 优化比较函数，检查关键属性变化
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.selectedItem?.id === nextProps.selectedItem?.id &&
    prevProps.hoveredItem?.id === nextProps.hoveredItem?.id &&
    prevProps.items.every((item, index) => 
      item.id === nextProps.items[index]?.id &&
      item.updated_at === nextProps.items[index]?.updated_at
    )
  );
});
