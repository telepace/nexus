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
        className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20 p-3 rounded-lg border border-purple-200/50 dark:border-purple-800/50"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
            {title}
          </span>
        </div>
        <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed line-clamp-3">
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-3 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              智能总结
            </span>
          </div>
          {summarizer.summary?.main_thesis ? (
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed line-clamp-3">
              {summarizer.summary.main_thesis}
            </p>
          ) : summarizer.raw_text ? (
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed line-clamp-3">
              {summarizer.raw_text.substring(0, 150)}...
            </p>
          ) : null}
        </div>
      )}

      {key_points_extractor && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              关键要点
            </span>
          </div>
          {key_points_extractor.key_points?.core_concepts ? (
            <div className="space-y-1">
              {key_points_extractor.key_points.core_concepts.slice(0, 2).map((concept, index) => (
                <div key={index} className="flex items-start gap-1">
                  <Lightbulb className="h-2 w-2 text-emerald-600 dark:text-emerald-400 mt-1 flex-shrink-0" />
                  <span className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed line-clamp-2">
                    {concept.point}
                  </span>
                </div>
              ))}
              {key_points_extractor.key_points.core_concepts.length > 2 && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  +{key_points_extractor.key_points.core_concepts.length - 2} 更多要点
                </div>
              )}
            </div>
          ) : key_points_extractor.raw_text ? (
            <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed line-clamp-3">
              {key_points_extractor.raw_text.substring(0, 150)}...
            </p>
          ) : null}
        </div>
      )}

      {otherEntries.map(([key, value], idx) => renderGenericAnalysis(key, value, idx))}
    </div>
  )
} 