"use client";

import { useRouter } from "next/navigation";
import { Clock, Eye, Heart, Zap, MoreHorizontal } from "lucide-react";
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
import {
  PromptData,
  favoritePrompt,
  unfavoritePrompt,
} from "@/components/actions/prompts-action";
import { memo, useCallback, useMemo, useState } from "react";

interface PromptCardsProps {
  prompts: PromptData[];
  currentUser: {
    id: string;
    email: string;
    full_name?: string;
  } | null;
}

// 生成一致的统计数据，避免 Hydration 错误 - 使用 useMemo 优化
const generateConsistentStats = (promptId: string) => {
  // 使用 prompt ID 作为种子生成一致的"随机"数据
  const seed = promptId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    views: Math.floor((seed % 1000) + 100), // 100-1099
    likes: Math.floor((seed % 50) + 10), // 10-59
    useCount: Math.floor((seed % 200) + 50), // 50-249
  };
};

// 单个卡片组件 - 使用 memo 优化重复渲染
const PromptCard = memo(
  ({
    prompt,
    currentUser,
    onCardClick,
  }: {
    prompt: PromptData;
    currentUser: PromptCardsProps["currentUser"];
    onCardClick: (promptId: string, event: React.MouseEvent) => void;
  }) => {
    const authorName =
      prompt.creator?.name ||
      (currentUser && prompt.created_by === currentUser.id
        ? currentUser.full_name || currentUser.email || "我"
        : "未知");

    // 使用 useMemo 缓存统计数据计算
    const stats = useMemo(
      () => generateConsistentStats(prompt.id),
      [prompt.id],
    );

    const [isFavorited, setIsFavorited] = useState(prompt.is_favorited);

    const handleFavoriteClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFavorited) {
        await unfavoritePrompt(prompt.id);
        setIsFavorited(false);
      } else {
        await favoritePrompt(prompt.id);
        setIsFavorited(true);
      }
    };

    // 使用 useCallback 优化点击处理函数
    const handleClick = useCallback(
      (event: React.MouseEvent) => {
        onCardClick(prompt.id, event);
      },
      [prompt.id, onCardClick],
    );

    return (
      <div
        className="group relative bg-white border border-slate-200/60 rounded-2xl overflow-hidden hover:shadow-lg hover:border-slate-300/60 transition-all duration-200 cursor-pointer prompt-card"
        onClick={handleClick}
      >
        {/* Toggle Switch - 减少 z-index 和定位复杂度 */}
        <div className="absolute top-3 right-3 prompt-toggle-container">
          <PromptToggle
            promptId={prompt.id}
            enabled={prompt.user_enabled ?? false}
            promptName={prompt.name}
          />
        </div>

        <div className="p-4 pt-6">
          {/* Title - 减少字体大小和间距 */}
          <h3 className="text-lg font-medium text-slate-900 mb-2 line-clamp-1 pr-12 text-optimized">
            {prompt.name}
          </h3>

          {/* Description - 减少行高和间距 */}
          <p className="text-slate-600 text-sm line-clamp-2 mb-3 leading-normal text-optimized">
            {prompt.description || "暂无描述"}
          </p>

          {/* Stats - 简化布局，减少间距 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{stats.views.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{stats.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{stats.useCount}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg transition-opacity duration-200"
                onClick={handleFavoriteClick}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorited ? "text-red-500" : "text-slate-500"}`}
                />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-100 rounded-lg transition-opacity duration-200"
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
          </div>

          {/* Tags - 减少间距和尺寸 */}
          <div className="flex flex-wrap gap-1 mb-3">
            {prompt.tags && prompt.tags.length > 0 ? (
              prompt.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs"
                >
                  {tag.name}
                </span>
              ))
            ) : (
              <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-xs">
                无标签
              </span>
            )}
            {prompt.tags && prompt.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>

          {/* Footer - 减少间距和尺寸 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {authorName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-600 truncate max-w-[100px]">
                {authorName}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
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
  },
);

PromptCard.displayName = "PromptCard";

export function PromptCards({ prompts, currentUser }: PromptCardsProps) {
  const router = useRouter();

  // 使用 useCallback 优化点击处理函数
  const handleCardClick = useCallback(
    (promptId: string, event: React.MouseEvent) => {
      // 阻止事件冒泡，避免与其他交互元素冲突
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest("button") ||
          event.target.closest("[role=switch]") ||
          event.target.closest("[data-dropdown-trigger]") ||
          event.target.closest(".prompt-toggle-container"))
      ) {
        return;
      }

      router.push(`/prompts/edit/${promptId}`);
    },
    [router],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 prompt-cards-container">
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          currentUser={currentUser}
          onCardClick={handleCardClick}
        />
      ))}
    </div>
  );
}
