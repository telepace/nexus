"use client"

import type { ContentItemPublic } from '../types'
import { ContentCard } from './ContentCard'
import { Separator } from '@/components/ui/separator'

interface Props {
  items: ContentItemPublic[]
  selectedItem: ContentItemPublic | null
  onSelect: (item: ContentItemPublic) => void
  prefetchContent: (item: ContentItemPublic) => void
}

export const ContentList = ({ items, selectedItem, onSelect, prefetchContent }: Props) => {
  if (!items.length) return null

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <>
          <ContentCard
            key={item.id}
            item={item}
            selected={selectedItem?.id === item.id}
            onSelect={onSelect}
            prefetchContent={prefetchContent}
          />
          {idx !== items.length - 1 && <Separator />}
        </>
      ))}
    </div>
  )
} 