import React from "react";
import { Globe, Clock } from "lucide-react";
import { truncateText, formatTime } from "../lib/utils";
import type { PageInfo } from "../lib/types";

interface PageInfoProps {
  pageInfo: PageInfo | null;
}

export function PageInfo({ pageInfo }: PageInfoProps) {
  if (!pageInfo) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">正在获取页面信息...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-500" />
        <h3 className="font-medium text-sm">{truncateText(pageInfo.title, 50)}</h3>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>{formatTime(pageInfo.timestamp)}</span>
      </div>
      
      <div className="text-xs text-gray-600">
        <p className="truncate">{pageInfo.url}</p>
      </div>
      
      <div className="text-xs text-gray-500">
        内容长度: {pageInfo.content.length.toLocaleString()} 字符
      </div>
    </div>
  );
} 