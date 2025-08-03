"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConversationPublic } from "@/lib/api/ai-conversations";
import { contentApi } from "@/lib/api/content";

interface ConversationHistoryOptions {
  contentId: string; // API调用使用的原始ID
  storageId?: string; // 可选的存储ID，用于状态隔离
  onError?: (error: string) => void;
}

/**
 * 统一的对话历史管理Hook
 * 负责加载、缓存和管理历史对话记录
 * 
 * 🎯 支持分离的API ID和存储ID：
 * - contentId: 用于API调用（如 "12345"）
 * - storageId: 用于状态存储（如 "preview_12345"）
 */
export function useConversationHistory({
  contentId,
  storageId,
  onError,
}: ConversationHistoryOptions) {
  const [historyRecords, setHistoryRecords] = useState<ConversationPublic[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  // 🎯 缓存键使用storageId（如果提供）或回退到contentId
  const effectiveStorageId = storageId || contentId;
  const CACHE_KEY = `conversation_history_${effectiveStorageId}`;
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

  // 保存历史记录到localStorage - 添加防抖和错误处理
  const saveCachedHistory = useCallback((records: ConversationPublic[]) => {
    // 使用防抖机制，避免频繁写入
    const debouncedSave = setTimeout(() => {
      try {
        const timestamp = Date.now();
        // 限制历史记录数量，防止内存泄漏
        const limitedRecords = records.slice(0, 50);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: limitedRecords,
          timestamp
        }));
        setLastLoadTime(timestamp);
        console.log('💾 保存对话历史到缓存:', limitedRecords.length, '条记录');
      } catch (error) {
        console.error('❌ 保存历史记录缓存失败:', error);
        // 尝试清理旧缓存后重试
        try {
          localStorage.removeItem(CACHE_KEY);
          const minimalRecords = records.slice(0, 20);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: minimalRecords,
            timestamp: Date.now()
          }));
        } catch (retryError) {
          console.error('❌ 重试保存缓存也失败:', retryError);
        }
      }
    }, 300);

    return () => clearTimeout(debouncedSave);
  }, [CACHE_KEY]);

  // 错误重试计数器 - 使用useRef避免触发重新渲染
  const errorCountRef = useRef(0);
  const isBlockedRef = useRef(false);
  const blockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_ERROR_COUNT = 3;
  const BLOCK_DURATION = 5 * 60 * 1000; // 5分钟阻断

  // 从API加载历史记录 - 添加熔断机制，使用useRef避免依赖循环
  const loadHistoryFromAPI = useCallback(async (force = false) => {
    // 熔断机制：如果错误次数过多，暂时阻断请求
    if (isBlockedRef.current) {
      console.log('🚫 API调用已被熔断，跳过请求');
      return;
    }

    // 如果不是强制刷新且距离上次加载时间不足1分钟，跳过
    if (!force && Date.now() - lastLoadTime < 60 * 1000) {
      console.log('⏭️ 跳过API加载，距离上次加载时间太短');
      return;
    }

    // 如果contentId为空，直接返回，避免无效请求
    if (!contentId || contentId.trim() === '') {
      console.log('⏭️ contentId为空，跳过API加载');
      return;
    }

    setIsLoadingHistory(true);
    try {
      console.log('🔄 从API加载对话历史...', { contentId, errorCount: errorCountRef.current });
      
      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      const response = await contentApi.getContentConversations(contentId, false);
      
      clearTimeout(timeoutId);
      
      if (response && response.conversations) {
        const records = response.conversations
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20); // 只保留最近20条记录
        
        setHistoryRecords(records);
        // 重置错误计数
        errorCountRef.current = 0;
        
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
        // 不调用onError，避免触发更多问题
      }
    } catch (error) {
      console.error('❌ 加载对话历史失败:', error);
      
      // 增加错误计数
      const newErrorCount = errorCountRef.current + 1;
      errorCountRef.current = newErrorCount;
      
      // 如果错误次数达到上限，启动熔断
      if (newErrorCount >= MAX_ERROR_COUNT) {
        console.error('🚫 错误次数过多，启动熔断机制');
        isBlockedRef.current = true;
        
        // 清除之前的超时器
        if (blockTimeoutRef.current) {
          clearTimeout(blockTimeoutRef.current);
        }
        
        // 5分钟后解除阻断
        blockTimeoutRef.current = setTimeout(() => {
          isBlockedRef.current = false;
          errorCountRef.current = 0;
          console.log('🔓 熔断机制已解除');
        }, BLOCK_DURATION);
      }
      
      // 不调用onError，避免触发更多问题
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contentId, lastLoadTime, CACHE_KEY]); // 移除errorCount和isBlocked依赖，避免循环

  // 初始化加载历史记录 - 修复无限循环问题
  useEffect(() => {
    let mounted = true;
    const timeoutId: NodeJS.Timeout | null = null;
    
    const initializeHistory = async () => {
      // 如果contentId为空，直接返回
      if (!contentId || contentId.trim() === '') {
        console.log('⏭️ contentId为空，跳过初始化历史记录');
        return;
      }
      
      // 先尝试加载缓存
      const hasCached = loadCachedHistory();
      
      // 如果没有缓存或缓存过期，从API加载
      if (!hasCached && mounted) {
        await loadHistoryFromAPI();
      } else if (hasCached && mounted) {
        // 🚫 移除后台异步更新，避免在preview模式下触发不必要的API调用
        console.log('✅ 使用缓存的历史记录，跳过后台更新');
      }
    };
    
    initializeHistory();
    
    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [contentId, effectiveStorageId]); // 依赖API调用的contentId和存储用的effectiveStorageId

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

  // 组件卸载时的清理机制
  useEffect(() => {
    return () => {
      // 清理熔断超时器
      if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = null;
      }
      // 重置熔断状态
      isBlockedRef.current = false;
      errorCountRef.current = 0;
    };
  }, []);

  return {
    historyRecords,
    isLoadingHistory,
    refreshHistory,
    clearHistoryCache,
    addHistoryRecord,
    lastLoadTime,
  };
}