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
      className={`cursor-pointer transition-all duration-200 ease-out border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:shadow-md active:translate-y-0 ${
        selected ? 'ring-1 ring-primary shadow-xl scale-[1.02] -translate-y-1' : ''
      }`}
      onClick={handleClick}
      onMouseDown={createRipple}
      onMouseEnter={() => {
        onSelect(item)
        prefetchContent(item)
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="w-12 h-12 rounded-lg bg-transparent flex items-center justify-center">
              {getContentIcon(item.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate mb-2">
                {item.title || '无标题'}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {item.summary || '暂无摘要'}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <ProcessingStatusBadge status={item.processing_status as ProcessingStatus} size="sm" />
                <Badge variant="outline" className="text-xs">
                  {item.type.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 