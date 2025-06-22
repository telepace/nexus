"use client"

import {
  Brain,
  FileText,
  Target,
  Sparkles,
  Lightbulb,
} from 'lucide-react'
import type { ContentItemPublic } from '../types'

interface Props {
  analysis: ContentItemPublic['ai_analysis']
}

export const AIAnalysisCard = ({ analysis }: Props) => {
  if (!analysis) return null

  const { summarizer, key_points_extractor, ...restAnalyses } = analysis

  const otherEntries = Object.entries(restAnalyses).filter(
    ([, value]) => value && typeof value === 'object',
  )

  const renderGenericAnalysis = (
    title: string,
    content: unknown,
    index: number,
  ) => {
    if (!content) return null

    const isObject = typeof content === 'object' && content !== null
    const contentObj = isObject ? (content as Record<string, unknown>) : null

    const preview =
      (typeof content === 'string' && content) ||
      (contentObj?.analysis_result &&
      typeof contentObj.analysis_result === 'string'
        ? (contentObj.analysis_result as string)
        : null) ||
      (contentObj?.raw_text && typeof contentObj.raw_text === 'string'
        ? (contentObj.raw_text as string)
        : null) ||
      (isObject ? JSON.stringify(content).substring(0, 150) : null)

    if (!preview) return null

    return (
      <div
        key={index}
        className="p-3 rounded-lg"
      >
        <div className="mb-2">
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs font-medium">{title}</span>
          </div>
        </div>
        <p className="text-sm leading-relaxed">
          {typeof preview === 'string' ? preview.substring(0, 150) + '...' : '(unsupported format)'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Brain className="h-4 w-4" />
        AI 智能分析
      </div>

      {summarizer && (
        <div className="p-3 rounded-lg">
          <div className="mb-2">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow">
              <FileText className="h-3 w-3" />
              <span className="text-xs font-medium ">智能总结</span>
            </div>
          </div>
          {summarizer.summary?.main_thesis ? (
            <p className="text-sm leading-relaxed">
              {summarizer.summary.main_thesis}
            </p>
          ) : summarizer.raw_text ? (
            <p className="text-sm leading-relaxed">
              {summarizer.raw_text.substring(0, 150)}...
            </p>
          ) : null}
        </div>
      )}

      {key_points_extractor && (
        <div className="p-3 rounded-lg">
          <div className="mb-2">
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl shadow">
              <Target className="h-3 w-3" />
              <span className="text-xs font-medium">关键要点</span>
            </div>
          </div>
          {key_points_extractor.key_points?.core_concepts ? (
            <div className="space-y-1">
              {key_points_extractor.key_points.core_concepts.slice(0, 2).map((concept, index) => (
                <div key={index} className="flex items-start gap-1">
                  <Lightbulb className="h-2 w-2 mt-1 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">
                    {concept.point}
                  </span>
                </div>
              ))}
              {key_points_extractor.key_points.core_concepts.length > 2 && (
                <div className="text-xs font-medium">
                  +{key_points_extractor.key_points.core_concepts.length - 2} 更多要点
                </div>
              )}
            </div>
          ) : key_points_extractor.raw_text ? (
            <p className="text-sm leading-relaxed">
              {key_points_extractor.raw_text.substring(0, 150)}...
            </p>
          ) : null}
        </div>
      )}

      {otherEntries.map(([key, value], idx) => renderGenericAnalysis(key, value, idx))}
    </div>
  )
} 