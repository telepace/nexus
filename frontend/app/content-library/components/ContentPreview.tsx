"use client"

import { FileText, Calendar, Clock } from 'lucide-react'
import { AIAnalysisCard } from './AIAnalysisCard'
import type { ContentItemPublic } from '../types'

interface Props {
  item: ContentItemPublic | null
}

export const ContentPreview = ({ item }: Props) => {
  return (
    <div className="h-full shadow-macos-window  bg-neutral-100 rounded-sm  flex flex-col overflow-hidden">
      <div className="flex items-center h-header px-4">
        <div className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-5 w-5" />
          内容预览
        </div>
      </div>
      <div className="pb-4 flex-1 overflow-auto mt-12">
        {item ? (
          <div className="space-y-6 max-w-[28rem] mx-auto">
            <div>
              <h3 className="font-semibold mb-3 text-lg">
                {item.title || '无标题'}
              </h3>
              <div className="mb-4">
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow">
                  <span className="text-xs font-medium">
                    {item.type.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

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
      </div>
    </div>
  )
} 