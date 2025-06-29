"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Tag as TagIcon, Eye, Heart, Zap, MoreHorizontal, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { DateDisplay } from "@/components/ui/DateDisplay";
import { PromptToggle } from "../promptToggle";
import { DeleteButton } from "../deleteButton";
import { PromptData } from "@/components/actions/prompts-action";

interface PromptCardsProps {
  prompts: PromptData[];
  currentUser: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
}

// 生成一致的统计数据，避免 Hydration 错误
const generateConsistentStats = (promptId: string) => {
  // 使用 prompt ID 作为种子生成一致的"随机"数据
  const seed = promptId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  return {
    views: Math.floor((seed % 1000) + 100), // 100-1099
    likes: Math.floor((seed % 50) + 10),    // 10-59
    useCount: Math.floor((seed % 200) + 50) // 50-249
  };
};

export function PromptCards({ prompts, currentUser }: PromptCardsProps) {
  const router = useRouter();

  const handleCardClick = (promptId: string, event: React.MouseEvent) => {
    // 阻止事件冒泡，避免与其他交互元素冲突
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest("button") ||
        event.target.closest('[role="switch"]') ||
        event.target.closest("[data-dropdown-trigger]") ||
        event.target.closest(".prompt-toggle-container"))
    ) {
      return;
    }

    router.push(`/prompts/edit/${promptId}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {prompts.map((prompt) => {
        const authorName =
          prompt.creator?.name ||
          (currentUser && prompt.created_by === currentUser.id
            ? currentUser.full_name || currentUser.email || "我"
            : "未知");

        // 使用一致的统计数据，避免 Hydration 错误
        const stats = generateConsistentStats(prompt.id);

        return (
          <div
            key={prompt.id}
            className="group relative bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-slate-200/30 transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            onClick={(e) => handleCardClick(prompt.id, e)}
          >
            {/* Toggle Switch */}
            <div className="absolute top-6 right-6 z-10 prompt-toggle-container">
              <PromptToggle
                promptId={prompt.id}
                enabled={prompt.user_enabled ?? false}
                promptName={prompt.name}
              />
            </div>

            <div className="p-8 pt-12">
              {/* Title */}
              <h3 className="text-xl font-medium text-slate-900 mb-4 line-clamp-1 group-hover:text-slate-700 transition-colors duration-300">
                {prompt.name}
              </h3>
              
              {/* Description */}
              <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-8 font-light">
                {prompt.description || "暂无描述"}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm font-light">{stats.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm font-light">{stats.likes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-light">{stats.useCount}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100/60 rounded-full transition-all duration-300"
                      data-dropdown-trigger
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4 text-slate-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/prompts/${prompt.id}`}
                        className="flex items-center"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        查看详情
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/prompts/edit/${prompt.id}`}
                        className="flex items-center"
                      >
                        <span className="mr-2">✏️</span>
                        编辑
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <DeleteButton promptId={prompt.id} />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-6">
                {prompt.tags && prompt.tags.length > 0 ? (
                  prompt.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-200 transition-colors duration-200"
                    >
                      {tag.name}
                    </span>
                  ))
                ) : (
                  <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-full text-xs">
                    无标签
                  </span>
                )}
                {prompt.tags && prompt.tags.length > 3 && (
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                    +{prompt.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-600 font-light truncate max-w-[120px]">{authorName}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 font-light">
                  <Clock className="h-3 w-3" />
                  <DateDisplay
                    date={prompt.updated_at}
                    format="distance"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
