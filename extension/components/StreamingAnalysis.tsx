import React, { useState, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';

interface PageData {
  title: string;
  url: string;
  content: string;
}

interface StreamingAnalysisProps {
  currentPage: PageData | null;
  onError: (error: string) => void;
}

interface AnalysisState {
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
}

export function StreamingAnalysis({ currentPage, onError }: StreamingAnalysisProps) {
  const [summaryState, setSummaryState] = useState<AnalysisState>({
    content: '',
    isStreaming: false,
    isComplete: false,
    error: null,
  });

  const [keyPointsState, setKeyPointsState] = useState<AnalysisState>({
    content: '',
    isStreaming: false,
    isComplete: false,
    error: null,
  });

  const [savedContentId, setSavedContentId] = useState<string | null>(null);
  const [isSavingContent, setIsSavingContent] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 保存页面内容到库并获取contentId
  const saveContentToLibrary = useCallback(async (): Promise<string> => {
    if (!currentPage) {
      throw new Error('没有页面数据可保存');
    }

    if (savedContentId) {
      return savedContentId;
    }

    setIsSavingContent(true);
    try {
      // 获取认证token
      const result = await chrome.storage.local.get(['accessToken']);
      const { accessToken } = result;

      if (!accessToken) {
        throw new Error('未找到认证token，请重新登录');
      }

      apiClient.setToken(accessToken);

      // 创建内容项
      const contentData = {
        type: 'webpage',
        source_uri: currentPage.url,
        title: currentPage.title,
        content_text: currentPage.content,
      };

      const response = await apiClient.createContent(contentData);
      const contentId = response.id;

      setSavedContentId(contentId);
      return contentId;
    } finally {
      setIsSavingContent(false);
    }
  }, [currentPage, savedContentId]);

  // 执行流式分析的通用函数
  const performStreamingAnalysis = useCallback(async (
    analysisType: 'summary' | 'key_points',
    setState: React.Dispatch<React.SetStateAction<AnalysisState>>
  ) => {
    if (!currentPage) {
      onError('没有页面数据可分析');
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      content: '',
      isStreaming: true,
      isComplete: false,
      error: null,
    }));

    try {
      // 先保存内容到库
      const contentId = await saveContentToLibrary();

      // 获取认证token
      const result = await chrome.storage.local.get(['accessToken']);
      const { accessToken } = result;

      if (!accessToken) {
        throw new Error('未找到认证token，请重新登录');
      }

      apiClient.setToken(accessToken);

      // 执行流式分析
      await apiClient.streamAnalysis(contentId, analysisType, {
        onChunk: (chunk) => {
          if (chunk.type === analysisType && !chunk.finished && chunk.content) {
            setState(prev => ({
              ...prev,
              content: prev.content + chunk.content,
            }));
          } else if (chunk.type === 'error') {
            setState(prev => ({
              ...prev,
              error: chunk.content,
              isStreaming: false,
            }));
          }
        },
        onComplete: (fullContent) => {
          setState(prev => ({
            ...prev,
            content: fullContent,
            isStreaming: false,
            isComplete: true,
          }));
        },
        onError: (error) => {
          setState(prev => ({
            ...prev,
            error,
            isStreaming: false,
          }));
          onError(`分析失败: ${error}`);
        },
        signal: abortControllerRef.current.signal,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isStreaming: false,
      }));
      onError(`分析失败: ${errorMessage}`);
    }
  }, [currentPage, saveContentToLibrary, onError]);

  // 处理AI摘要
  const handleSummary = () => {
    performStreamingAnalysis('summary', setSummaryState);
  };

  // 处理关键要点
  const handleKeyPoints = () => {
    performStreamingAnalysis('key_points', setKeyPointsState);
  };

  // 取消分析
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSummaryState(prev => ({ ...prev, isStreaming: false }));
    setKeyPointsState(prev => ({ ...prev, isStreaming: false }));
  };

  const renderAnalysisCard = (
    title: string,
    state: AnalysisState,
    testId: string,
    icon: string
  ) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-gray-800 flex items-center">
            <span className="mr-2">{icon}</span>
            {title}
          </h5>
          {state.isStreaming && (
            <button
              onClick={handleCancel}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-300 rounded"
            >
              取消
            </button>
          )}
        </div>

        {state.isStreaming && (
          <div className="mb-3" data-testid="analysis-loading">
            <div className="flex items-center text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
              正在分析...
            </div>
          </div>
        )}

        {state.error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded" data-testid="analysis-error">
            <p className="text-sm text-red-700">错误: {state.error}</p>
          </div>
        )}

        {state.content && (
          <div 
            className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap"
            data-testid={testId}
          >
            {state.content}
          </div>
        )}

        {state.isComplete && !state.error && (
          <div className="mt-3 pt-3 border-t border-gray-100" data-testid="analysis-complete">
            <p className="text-xs text-green-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              分析完成
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
          AI 智能分析
          {isSavingContent && (
            <span className="ml-2 text-xs text-gray-500">(正在保存内容...)</span>
          )}
        </h4>

        {/* 分析按钮 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleSummary}
            disabled={!currentPage || summaryState.isStreaming || keyPointsState.isStreaming || isSavingContent}
            className="flex flex-col items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-blue-150 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white mb-2">
              📝
            </div>
            <span className="text-xs font-medium text-blue-700">AI 摘要</span>
          </button>
          
          <button
            onClick={handleKeyPoints}
            disabled={!currentPage || summaryState.isStreaming || keyPointsState.isStreaming || isSavingContent}
            className="flex flex-col items-center p-3 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg hover:from-green-100 hover:to-green-150 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white mb-2">
              🎯
            </div>
            <span className="text-xs font-medium text-green-700">关键要点</span>
          </button>
        </div>

        {/* 分析结果 */}
        <div className="space-y-4">
          {(summaryState.content || summaryState.isStreaming || summaryState.error) && 
            renderAnalysisCard('内容摘要', summaryState, 'summary-analysis', '📝')
          }
          
          {(keyPointsState.content || keyPointsState.isStreaming || keyPointsState.error) && 
            renderAnalysisCard('关键要点', keyPointsState, 'keypoints-analysis', '🎯')
          }
        </div>
      </div>
    </div>
  );
} 