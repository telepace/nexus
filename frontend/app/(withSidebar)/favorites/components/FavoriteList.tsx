"use client";

import { FavoriteCard } from "./FavoriteCard";

interface FavoriteItemData {
  id: string;
  content_item: {
    id: string;
    title?: string;
    type: string;
    source_uri?: string;
    summary?: string;
    processing_status: string;
    created_at: string;
    updated_at: string;
    ai_result?: {
      content_quality_score?: number;
      labels?: string[];
      brief_description?: string;
      reading_time_minutes?: number;
    };
  };
  created_at: string;
}

interface Props {
  items: FavoriteItemData[];
  selectedItem: FavoriteItemData | null;
  hoveredItem: FavoriteItemData | null;
  onCardClick: (item: FavoriteItemData, event?: React.MouseEvent) => void;
  onCardHover: (item: FavoriteItemData | null) => void;
  onItemDeleted?: (itemId: string) => void;
}

export const FavoriteList = ({
  items,
  selectedItem,
  hoveredItem,
  onCardClick,
  onCardHover,
  onItemDeleted,
}: Props) => {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FavoriteCard
          key={item.id}
          item={item}
          selected={selectedItem?.id === item.id}
          hovered={hoveredItem?.id === item.id}
          onCardClick={onCardClick}
          onCardHover={onCardHover}
          onItemDeleted={onItemDeleted}
        />
      ))}
    </div>
  );
}; 