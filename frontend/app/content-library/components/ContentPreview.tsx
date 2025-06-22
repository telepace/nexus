"use client"

import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AIAnalysisCard } from './AIAnalysisCard'
import type { ContentItemPublic } from '../types'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Panel {
  id: number
  item: ContentItemPublic
}

let panelIdCounter = 0

interface Props {
  item: ContentItemPublic | null
}

export const ContentPreview = ({ item }: Props) => {
  const [panels, setPanels] = useState<Panel[]>([])

  useEffect(() => {
    if (item) {
      // 只有当传入的 item 与栈顶的 item 内容不同时才添加新面板
      if (item.id !== panels[panels.length - 1]?.item.id) {
        panelIdCounter++
        const newPanels = [...panels, { id: panelIdCounter, item: item }].slice(-2)
        setPanels(newPanels)
      }
    }
  }, [item])

  if (!panels.length && !item) {
    return (
        <div className="h-full shadow-macos-window bg-neutral-100 rounded-sm flex flex-col overflow-hidden">
            <div className="flex items-center h-header px-4">
                <div className="flex items-center gap-2 text-base font-medium">
                    <FileText className="h-5 w-5" />
                    内容预览
                </div>
            </div>
            <div className="pb-4 flex-1 overflow-auto mt-12">
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                    <p className="text-sm text-muted-foreground">点击内容卡片查看预览</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {panels.map((panel, index) => (
          <motion.div
            key={panel.id}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ scale: 0.7}}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            style={{
              position: 'absolute',
              inset: '0',
              zIndex: 10 + index, 
            }}
          >
            <PanelContent item={panel.item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// 子组件渲染实际内容，避免重复
const PanelContent = ({ item }: { item: ContentItemPublic }) => {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0 })
    containerRef.current?.focus?.()
  }, [])

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="h-full shadow-macos-window bg-neutral-100 rounded-sm flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-header px-4">
        <div className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-5 w-5" />
          内容预览
        </div>
      </div>

      {/* Body */}
      <div className="pb-4 flex-1 overflow-auto mt-12">
        <div className="space-y-6 max-w-[28rem] mx-auto">
          {/* 标题 */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">{item.title || '无标题'}</h3>
            <div className="mb-4">
              <div
                role="button"
                tabIndex={0}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow cursor-pointer transition"
                onClick={() => router.push(`/content-library/reader/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/content-library/reader/${item.id}`)
                  }
                }}
              >
                <span className="text-xs font-medium">查看全文</span>
              </div>
            </div>
          </div>

          {/* 摘要 & 来源 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">摘要</label>
              <p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-lg">{item.summary || '暂无摘要'}</p>
            </div>

            {item.source_uri && (
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">来源</label>
                <p className="text-sm break-all bg-muted/30 p-3 rounded-lg">
                  <a
                    href={item.source_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {item.source_uri}
                  </a>
                </p>
              </div>
            )}

            {/* 日期信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-muted-foreground block mb-1">创建时间</label>
                <div className="flex items-center gap-1">{new Date(item.created_at).toLocaleDateString('zh-CN')}</div>
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">更新时间</label>
                <div className="flex items-center gap-1">{new Date(item.updated_at).toLocaleDateString('zh-CN')}</div>
              </div>
            </div>
          </div>

          {/* AI 分析 */}
          <AIAnalysisCard analysis={item.ai_analysis} />
        </div>
      </div>
    </div>
  )
}
