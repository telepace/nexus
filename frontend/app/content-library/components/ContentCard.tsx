"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileText, Link, BookOpen } from 'lucide-react'
import { ProcessingStatusBadge, ProcessingStatus } from '@/components/ui/ProcessingStatusBadge'
import { createRipple } from '../utils/ripple'
import type { ContentItemPublic } from '../types'
import { useRouter } from 'next/navigation'

interface Props {
  item: ContentItemPublic
  selected: boolean
  onSelect: (item: ContentItemPublic) => void
  prefetchContent: (item: ContentItemPublic) => void
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-4 w-4" />
    case 'url':
      return <Link className="h-4 w-4" />
    case 'text':
      return <BookOpen className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

export const ContentCard = ({ item, selected, onSelect, prefetchContent }: Props) => {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/content-library/reader/${item.id}`)
  }

  return (
    <Card
      key={item.id}
      className={`cursor-pointer rounded-lg overflow-hidden transition-colors duration-200 ease-out bg-transparent border border-transparent shadow-none hover:bg-[var(--color-linear-bg-2)] hover:border-[var(--mac-gray-5)] hover:shadow-md w-libraryCard`}
      onClick={handleClick}
      onMouseDown={createRipple}
      onMouseEnter={() => {
        onSelect(item)
        prefetchContent(item)
      }}
    >
      <CardContent className="p-4 pl-1 flex flex-col h-full">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
            {getContentIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base line-clamp-2 mb-1 text-neutral-800 dark:text-neutral-100 max-w-cardTitle break-words">
              {item.title || '无标题'}
            </h3>
            <p className="text-sm text-neutral-400 dark:text-neutral-400 line-clamp-4 leading-relaxed max-w-cardTitle break-words">
              {item.summary || '暂无摘要'}
            </p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <ProcessingStatusBadge
                status={item.processing_status as ProcessingStatus}
                size="sm"
                className="text-neutral-400"
              />
              <span className="text-xs text-neutral-400">
                {new Date(item.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 