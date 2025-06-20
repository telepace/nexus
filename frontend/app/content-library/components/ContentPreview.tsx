"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, FileText } from 'lucide-react'
import { AIAnalysisCard } from './AIAnalysisCard'
import type { ContentItemPublic } from '../types'

interface Props {
  item: ContentItemPublic | null
}

export const ContentPreview = ({ item }: Props) => {
  return (
    <Card className="sticky top-6 border-0 shadow-lg">
      <CardHeader className="pt-4 pb-4">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          内容预览
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {item ? (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3 text-lg">
                {item.title || '无标题'}
              </h3>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.type.toUpperCase()}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  摘要
                </label>
                <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">
                  {item.summary || '暂无摘要'}
                </p>
              </div>

              {item.source_uri && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    来源
                  </label>
                  <p className="text-sm break-all bg-muted/30 p-3 rounded-lg">
                    <a
                      href={item.source_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {item.source_uri}
                    </a>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground block mb-1">创建时间</label>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.created_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">更新时间</label>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(item.updated_at).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            </div>

            <AIAnalysisCard analysis={item.ai_analysis} />
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">悬停内容卡片查看预览</p>
              <p className="text-xs text-muted-foreground/70">点击卡片直接开始阅读</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 