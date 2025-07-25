"use client";

import { useState, useEffect, useCallback } from "react";
import { ConversationPublic } from "@/lib/api/ai-conversations";
import { contentApi } from "@/lib/api/content";

interface ConversationHistoryOptions {
  contentId: string;
  onError?: (error: string) => void;
}

/**
 * 统一的对话历史管理Hook
 * 负责加载、缓存和管理历史对话记录
 */
export function useConversationHistory({
  contentId,
  onError,
}: ConversationHistoryOptions) {
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  // 缓存键
  const CACHE_KEY = `conversation_history_${contentId}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  // 从localStorage加载缓存的历史记录
  const loadCachedHistory = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setHistoryRecords(data);
          setLastLoadTime(timestamp);
          console.log('📥 加载缓存的对话历史:', data.length, '条记录');
          return true;
        }
      }
    } catch (error) {
      console.error('❌ 加载缓存历史记录失败:', error);
    }
    return false;
  }, [CACHE_KEY, CACHE_DURATION]);

  // 保存历史记录到localStorage
  const saveCachedHistory = useCallback((records: ConversationPublic[]) => {
    try {
      const timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: records,
        timestamp
      }));
      setLastLoadTime(timestamp);
      console.log('💾 保存对话历史到缓存:', records.length, '条记录');
    } catch (error) {
      console.error('❌ 保存历史记录缓存失败:', error);
    }
  }, [CACHE_KEY]);

  // 从API加载历史记录
  const loadHistoryFromAPI = useCallback(async (force = false) => {
    // 如果不是强制刷新且距离上次加载时间不足1分钟，跳过
    if (!force && Date.now() - lastLoadTime < 60 * 1000) {
      console.log('⏭️ 跳过API加载，距离上次加载时间太短');
      return;
    }

    setIsLoadingHistory(true);
    try {
      console.log('🔄 从API加载对话历史...');
      const response = await contentApi.getContentConversations(contentId);
      
      if (response && response.conversations) {
        const records = response.conversations
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20); // 只保留最近20条记录
        
        setHistoryRecords(records);
        // 直接调用localStorage而不是依赖saveCachedHistory函数
        try {
          const timestamp = Date.now();
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: records,
            timestamp
          }));
          setLastLoadTime(timestamp);
          console.log('💾 保存对话历史到缓存:', records.length, '条记录');
        } catch (cacheError) {
          console.error('❌ 保存历史记录缓存失败:', cacheError);
        }
        console.log('✅ 成功加载对话历史:', records.length, '条记录');
      } else {
        console.warn('⚠️ API响应无效:', response);
        onError?.('无法加载对话历史');
      }
    } catch (error) {
      console.error('❌ 加载对话历史失败:', error);
      onError?.(error instanceof Error ? error.message : '加载历史记录失败');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contentId, lastLoadTime, CACHE_KEY, onError]);

  // 初始化加载历史记录
  useEffect(() => {
    let mounted = true;
    
    const initializeHistory = async () => {
      // 先尝试加载缓存
      const hasCached = loadCachedHistory();
      
      // 如果没有缓存或缓存过期，从API加载
      if (!hasCached && mounted) {
        await loadHistoryFromAPI();
      } else if (hasCached && mounted) {
        // 有缓存的情况下，在后台异步更新
        setTimeout(async () => {
          if (mounted) {
            await loadHistoryFromAPI();
          }
        }, 1000);
      }
    };
    
    initializeHistory();
    
    return () => {
      mounted = false;
    };
  }, [contentId]); // 只依赖contentId

  // 手动刷新历史记录
  const refreshHistory = useCallback(async () => {
    await loadHistoryFromAPI(true);
  }, [loadHistoryFromAPI]);

  // 清除历史记录缓存
  const clearHistoryCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
      setHistoryRecords([]);
      setLastLoadTime(0);
      console.log('🗑️ 清除对话历史缓存');
    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
    }
  }, [CACHE_KEY]);

  // 添加新的历史记录到本地状态
  const addHistoryRecord = useCallback((record: ConversationPublic) => {
    setHistoryRecords(prev => {
      const updated = [record, ...prev].slice(0, 20); // 保持最多20条
      // 直接保存到缓存，避免依赖saveCachedHistory函数
      try {
        const timestamp = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: updated,
          timestamp
        }));
        setLastLoadTime(timestamp);
      } catch (error) {
        console.error('❌ 添加历史记录时保存缓存失败:', error);
      }
      return updated;
    });
  }, [CACHE_KEY]);

  return {
    historyRecords,
    isLoadingHistory,
    refreshHistory,
    clearHistoryCache,
    addHistoryRecord,
    lastLoadTime,
  };
}