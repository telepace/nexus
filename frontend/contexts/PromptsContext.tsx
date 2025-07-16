"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchPrompts, PromptData } from '@/components/actions/prompts-action';

interface PromptsContextType {
  prompts: PromptData[];
  loadingPrompts: boolean;
  reloadPrompts: () => Promise<void>;
}

const PromptsContext = createContext<PromptsContextType | undefined>(undefined);

export const usePrompts = () => {
  const context = useContext(PromptsContext);
  if (context === undefined) {
    throw new Error('usePrompts must be used within a PromptsProvider');
  }
  return context;
};

interface PromptsProviderProps {
  children: ReactNode;
}

export const PromptsProvider: React.FC<PromptsProviderProps> = ({ children }) => {
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);

  const loadPrompts = async () => {
    try {
      setLoadingPrompts(true);
      const promptsResponse = await fetchPrompts({
        sort: "updated_at",
        order: "desc",
      });

      if (Array.isArray(promptsResponse)) {
        // 优化的过滤逻辑：
        // 1. 显示用户明确启用的 prompts (user_enabled: true)
        // 2. 显示系统启用且用户未设置的 prompts (enabled: true && user_enabled: undefined/null)
        // 3. 排除用户明确禁用的 prompts (user_enabled: false)
        const availablePrompts = promptsResponse
          .filter((p) => {
            // 系统级别必须启用
            if (!p.enabled) return false;

            // 如果用户明确禁用，则不显示
            if (p.user_enabled === false) return false;

            // 用户明确启用或者用户未设置（默认采用系统设置）
            return (
              p.user_enabled === true ||
              p.user_enabled === undefined ||
              p.user_enabled === null
            );
          })
          .slice(0, 7);

        setPrompts(availablePrompts);

        // 调试信息 - 只在首次加载时显示
        console.log("[PromptsProvider] Prompts 加载情况:", {
          总数: promptsResponse.length,
          系统启用: promptsResponse.filter((p) => p.enabled).length,
          用户启用: promptsResponse.filter((p) => p.user_enabled === true).length,
          用户禁用: promptsResponse.filter((p) => p.user_enabled === false).length,
          用户未设置: promptsResponse.filter(
            (p) => p.user_enabled === undefined || p.user_enabled === null,
          ).length,
          最终显示: availablePrompts.length,
          显示的prompts: availablePrompts.map((p) => ({
            name: p.name,
            enabled: p.enabled,
            user_enabled: p.user_enabled,
          })),
        });
      }
    } catch (error) {
      console.error("获取prompts失败:", error);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const reloadPrompts = async () => {
    await loadPrompts();
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  return (
    <PromptsContext.Provider
      value={{
        prompts,
        loadingPrompts,
        reloadPrompts,
      }}
    >
      {children}
    </PromptsContext.Provider>
  );
};