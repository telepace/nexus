import React, { useState, useEffect, useRef } from 'react'
import { streamApi, type StreamRequest, type StreamChunk } from '../lib/stream-api'

interface StreamContentProps {
  text: string
  autoStart?: boolean
  onComplete?: (summary: string, keypoints: string) => void
  onError?: (error: string) => void
}

interface ContentState {
  summary: {
    content: string
    loading: boolean
    error: string | null
  }
  keypoints: {
    content: string
    loading: boolean
    error: string | null
  }
}

export function StreamContent({ text, autoStart = true, onComplete, onError }: StreamContentProps) {
  const [state, setState] = useState<ContentState>({
    summary: { content: '', loading: false, error: null },
    keypoints: { content: '', loading: false, error: null }
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (autoStart && text.trim()) {
      startGeneration()
    }
  }, [text, autoStart])

  const startGeneration = async () => {
    if (!text.trim()) {
      onError?.('Text content is required')
      return
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // 重置状态
    setState({
      summary: { content: '', loading: true, error: null },
      keypoints: { content: '', loading: true, error: null }
    })

    const request: StreamRequest = {
      text: text.trim(),
      lang: 'auto',
      max_tokens: 1024
    }

    try {
      // 并行启动两个流
      const [summaryStream, keypointsStream] = await Promise.all([
        streamApi.getSummaryStream(request),
        streamApi.getKeypointsStream(request)
      ])

      // 处理摘要流
      const summaryReader = summaryStream.getReader()
      const keypointsReader = keypointsStream.getReader()

      // 并行处理两个流
      await Promise.all([
        processSummaryStream(summaryReader),
        processKeypointsStream(keypointsReader)
      ])

    } catch (error) {
      console.error('Stream generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        summary: { ...prev.summary, loading: false, error: errorMsg },
        keypoints: { ...prev.keypoints, loading: false, error: errorMsg }
      }))
      
      onError?.(errorMsg)
    }
  }

  const processSummaryStream = async (reader: ReadableStreamDefaultReader<StreamChunk>) => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (!mountedRef.current) return
        
        if (done) {
          setState(prev => ({
            ...prev,
            summary: { ...prev.summary, loading: false }
          }))
          break
        }

        if (value.error) {
          setState(prev => ({
            ...prev,
            summary: { ...prev.summary, loading: false, error: value.error! }
          }))
          return
        }

        if (value.delta) {
          setState(prev => ({
            ...prev,
            summary: { 
              ...prev.summary, 
              content: prev.summary.content + value.delta 
            }
          }))
        }

        if (value.done) {
          setState(prev => ({
            ...prev,
            summary: { ...prev.summary, loading: false }
          }))
          break
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  const processKeypointsStream = async (reader: ReadableStreamDefaultReader<StreamChunk>) => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (!mountedRef.current) return
        
        if (done) {
          setState(prev => ({
            ...prev,
            keypoints: { ...prev.keypoints, loading: false }
          }))
          break
        }

        if (value.error) {
          setState(prev => ({
            ...prev,
            keypoints: { ...prev.keypoints, loading: false, error: value.error! }
          }))
          return
        }

        if (value.delta) {
          setState(prev => ({
            ...prev,
            keypoints: { 
              ...prev.keypoints, 
              content: prev.keypoints.content + value.delta 
            }
          }))
        }

        if (value.done) {
          setState(prev => ({
            ...prev,
            keypoints: { ...prev.keypoints, loading: false }
          }))
          break
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // 检查是否都完成了
  useEffect(() => {
    if (!state.summary.loading && !state.keypoints.loading && 
        state.summary.content && state.keypoints.content) {
      onComplete?.(state.summary.content, state.keypoints.content)
    }
  }, [state.summary.loading, state.keypoints.loading, state.summary.content, state.keypoints.content])

  const handleRetry = () => {
    startGeneration()
  }

  return (
    <div className="stream-content space-y-4">
      {/* 摘要卡片 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white">📄</span>
              </div>
              <h3 className="text-white font-semibold">智能摘要</h3>
              {state.summary.loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
            </div>
            {state.summary.error && (
              <button 
                onClick={handleRetry}
                className="text-white/80 hover:text-white text-sm underline"
              >
                重试
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4">
          {state.summary.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm flex items-center">
                <span className="mr-2">❌</span>
                {state.summary.error}
              </p>
            </div>
          ) : (
            <div className="min-h-[60px]">
              {state.summary.content ? (
                <div 
                  className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: state.summary.content.replace(/\n/g, '<br/>') 
                  }}
                />
              ) : state.summary.loading ? (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <span className="text-sm ml-2">正在生成摘要...</span>
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">点击下方按钮开始分析</p>
              )}
              {state.summary.loading && state.summary.content && (
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 rounded-sm"></span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 关键要点卡片 */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white">🔑</span>
              </div>
              <h3 className="text-white font-semibold">关键要点</h3>
              {state.keypoints.loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
            </div>
            {state.keypoints.error && (
              <button 
                onClick={handleRetry}
                className="text-white/80 hover:text-white text-sm underline"
              >
                重试
              </button>
            )}
          </div>
        </div>
        
        <div className="p-4">
          {state.keypoints.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm flex items-center">
                <span className="mr-2">❌</span>
                {state.keypoints.error}
              </p>
            </div>
          ) : (
            <div className="min-h-[60px]">
              {state.keypoints.content ? (
                <div 
                  className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: state.keypoints.content.replace(/\n/g, '<br/>') 
                  }}
                />
              ) : state.keypoints.loading ? (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <span className="text-sm ml-2">正在提取要点...</span>
                </div>
              ) : (
                <p className="text-gray-400 italic text-sm">点击下方按钮开始分析</p>
              )}
              {state.keypoints.loading && state.keypoints.content && (
                <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-1 rounded-sm"></span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-3 pt-2">
        <button
          onClick={handleRetry}
          disabled={state.summary.loading || state.keypoints.loading}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>✨</span>
          <span>{state.summary.loading || state.keypoints.loading ? '分析中...' : '开始分析'}</span>
        </button>
        
        {state.summary.content && state.keypoints.content && (
          <button
            onClick={() => {
              const content = `## 摘要\n\n${state.summary.content}\n\n## 关键要点\n\n${state.keypoints.content}`;
              navigator.clipboard.writeText(content);
            }}
            className="px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
          >
            <span>📋</span>
            <span>复制</span>
          </button>
        )}
      </div>
    </div>
  )
} 