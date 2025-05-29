import React, { useState } from "react";
import { Brain, Key, Copy, Bookmark } from "lucide-react";
import { Button } from "./ui/Button";
import { generateSummary, extractKeyPoints, saveToLibrary } from "../lib/api";
import { copyToClipboard } from "../lib/utils";
import type { PageInfo } from "../lib/types";

interface PromptSectionProps {
  pageInfo: PageInfo | null;
  isAuthenticated: boolean;
}

export function PromptSection({ pageInfo, isAuthenticated }: PromptSectionProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});

  const handlePrompt = async (type: "summary" | "keypoints", apiCall: (content: string) => Promise<string>) => {
    if (!pageInfo?.content) return;
    
    setIsLoading(type);
    try {
      const result = await apiCall(pageInfo.content);
      setResults(prev => ({ ...prev, [type]: result }));
    } catch (error) {
      console.error(`Failed to ${type}:`, error);
      setResults(prev => ({ ...prev, [type]: `处理失败: ${error.message}` }));
    } finally {
      setIsLoading(null);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!pageInfo) return;
    
    setIsLoading("save");
    try {
      const success = await saveToLibrary(pageInfo.title, pageInfo.url, pageInfo.content);
      if (success) {
        alert("已保存到知识库");
      } else {
        alert("保存失败");
      }
    } catch (error) {
      alert(`保存失败: ${error.message}`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      alert("已复制到剪贴板");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-500">请先登录以使用 AI 功能</p>
      </div>
    );
  }

  if (!pageInfo?.content) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-500">正在获取页面内容...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          onClick={() => handlePrompt("summary", generateSummary)}
          isLoading={isLoading === "summary"}
          disabled={!!isLoading}
        >
          <Brain className="h-3 w-3 mr-1" />
          智能摘要
        </Button>
        
        <Button
          size="sm"
          onClick={() => handlePrompt("keypoints", extractKeyPoints)}
          isLoading={isLoading === "keypoints"}
          disabled={!!isLoading}
        >
          <Key className="h-3 w-3 mr-1" />
          关键要点
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleSaveToLibrary}
        isLoading={isLoading === "save"}
        disabled={!!isLoading}
      >
        <Bookmark className="h-3 w-3 mr-1" />
        保存到知识库
      </Button>

      {/* Results */}
      {Object.entries(results).map(([type, result]) => (
        <div key={type} className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-blue-800">
              {type === "summary" ? "智能摘要" : "关键要点"}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(result)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="text-sm text-blue-700 whitespace-pre-wrap">
            {result}
          </div>
        </div>
      ))}
    </div>
  );
} 