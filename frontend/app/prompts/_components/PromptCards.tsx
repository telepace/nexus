"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Tag as TagIcon } from "lucide-react";
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {prompts.map((prompt) => {
        const authorName =
          prompt.creator?.name ||
          (currentUser && prompt.created_by === currentUser.id
            ? currentUser.full_name || currentUser.email || "我"
            : "未知");

        return (
          <Card
            key={prompt.id}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
            onClick={(e) => handleCardClick(prompt.id, e)}
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold truncate flex-1 group-hover:text-primary transition-colors">
                  {prompt.name}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      data-dropdown-trigger
                    >
                      <span className="text-lg">⋯</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/prompts/${prompt.id}`}
                        className="flex items-center"
                      >
                        <span className="mr-2">👁️</span>
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

              <p className="text-sm text-muted-foreground mb-4 flex-grow leading-relaxed line-clamp-3">
                {prompt.description || "暂无描述"}
              </p>

              {/* 启用状态控件 */}
              <div className="mb-4 pb-4 border-b border-border/50 prompt-toggle-container">
                <PromptToggle
                  promptId={prompt.id}
                  enabled={prompt.user_enabled ?? false}
                  promptName={prompt.name}
                />
              </div>

              <div className="mt-auto space-y-3">
                {/* 标签 */}
                <div className="flex flex-wrap gap-1">
                  {prompt.tags && prompt.tags.length > 0 ? (
                    prompt.tags.slice(0, 3).map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-xs bg-primary/5 border-primary/20"
                      >
                        <TagIcon className="h-3 w-3 mr-1" />
                        {tag.name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-xs opacity-50">
                      无标签
                    </Badge>
                  )}
                  {prompt.tags && prompt.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{prompt.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* 元信息 */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <DateDisplay
                      date={prompt.updated_at}
                      format="distance"
                      className="text-xs"
                    />
                  </div>
                  <div className="truncate max-w-[100px]">
                    作者: {authorName}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
