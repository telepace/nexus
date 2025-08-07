"use client";

import React from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 静态AI面板组件 - 专为Preview模式设计
 * 
 * 🎯 设计原则：
 * 1. 纯展示组件 - 无实际交互功能
 * 2. 视觉一致性 - 保持与完整版本相同的外观
 * 3. 性能优化 - 最小化DOM和JavaScript开销
 * 4. 用户引导 - 提示用户切换到完整模式进行交互
 */

interface StaticAIPanelProps {
  className?: string;
  onNavigateToFullMode?: () => void;
}

export const StaticAIPanel: React.FC<StaticAIPanelProps> = ({
  className = "",
  onNavigateToFullMode,
}) => {
  // 静态prompt按钮数据
  const staticPrompts = [
    { id: "1", name: "总结要点", icon: "📝" },
    { id: "2", name: "深度分析", icon: "🔍" },
    { id: "3", name: "提取关键词", icon: "🏷️" },
    { id: "4", name: "生成问题", icon: "❓" },
  ];

  const handleInteractionAttempt = () => {
    onNavigateToFullMode?.();
  };

  return (
    <>
      <style jsx>{`
        /* 静态AI面板样式 */
        .static-ai-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(229, 231, 235, 0.8);
        }
        
        .dark .static-ai-panel {
          background: rgba(23, 23, 23, 0.95);
          border-top-color: rgba(64, 64, 64, 0.8);
        }
        
        .static-prompt-button {
          background: rgba(241, 245, 249, 0.8);
          color: rgba(71, 85, 105, 1);
          border: 1px solid rgba(203, 213, 225, 0.6);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .static-prompt-button:hover {
          background: rgba(241, 245, 249, 1);
          border-color: rgba(203, 213, 225, 1);
          transform: translateY(-1px);
        }
        
        .dark .static-prompt-button {
          background: rgba(51, 65, 85, 0.8);
          color: rgba(203, 213, 225, 1);
          border-color: rgba(75, 85, 99, 0.6);
        }
        
        .dark .static-prompt-button:hover {
          background: rgba(51, 65, 85, 1);
          border-color: rgba(75, 85, 99, 1);
        }
        
        .static-input {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(229, 231, 235, 0.8);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .static-input:hover {
          background: rgba(255, 255, 255, 1);
          border-color: rgba(156, 163, 175, 1);
        }
        
        .dark .static-input {
          background: rgba(39, 39, 42, 0.9);
          border-color: rgba(63, 63, 70, 0.8);
          color: rgba(244, 244, 245, 1);
        }
        
        .dark .static-input:hover {
          background: rgba(39, 39, 42, 1);
          border-color: rgba(82, 82, 91, 1);
        }
      `}</style>
      
      <div className={`static-ai-panel flex-shrink-0 ${className}`}>
        <div className="px-6 py-3">
          {/* AI指令标签行 */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {staticPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={handleInteractionAttempt}
                className="static-prompt-button inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0"
                title="点击查看完整分析功能"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{prompt.name}</span>
              </button>
            ))}
          </div>

          {/* 静态输入框 */}
          <div className="relative">
            <div 
              className="static-input flex items-center gap-3 pl-6 pr-3 py-3 rounded-3xl"
              onClick={handleInteractionAttempt}
              title="点击进入完整分析模式"
            >
              <div className="flex-1">
                <div className="text-base text-neutral-400 pointer-events-none select-none">
                  询问关于内容的任何问题...
                </div>
              </div>

              {/* 静态发送按钮 */}
              <Button
                size="icon"
                className="rounded-full h-6 w-6 shadow-md text-foreground hover:text-foreground bg-neutral-100 hover:bg-neutral-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 pointer-events-none"
                disabled
              >
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* 交互提示 */}
            <div className="absolute -top-8 left-0 right-0 text-center">
              <div className="inline-block px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs rounded-full border border-blue-200 dark:border-blue-800 opacity-0 hover:opacity-100 transition-opacity duration-200">
                点击进入完整交互模式
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};