"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Prompt } from "@/lib/api/services/prompts";

interface PromptCommandDialogProps {
  availablePrompts: Prompt[];
  // contentId: string; // 暂时移除未使用的参数
  isExecuting: boolean;
  onPromptSelect: (prompt: Prompt) => void;
  onExecute: (message: string, selectedPrompt: Prompt | null) => void;
  className?: string;
}

export function PromptCommandDialog({
  availablePrompts,
  // contentId, // 暂时移除未使用的参数
  isExecuting,
  onPromptSelect,
  onExecute,
  className,
}: PromptCommandDialogProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 处理输入变化
  useEffect(() => {
    if (input.startsWith("/")) {
      const searchTerm = input.slice(1).toLowerCase();
      const filtered = availablePrompts.filter(
        (prompt) =>
          prompt.name.toLowerCase().includes(searchTerm) ||
          prompt.description.toLowerCase().includes(searchTerm),
      );
      setFilteredPrompts(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFilteredPrompts([]);
    }
  }, [input, availablePrompts]);

  // 处理点击外部关闭建议
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePromptClick = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setInput(""); // 清空输入，让用户输入内容
    setShowSuggestions(false);
    onPromptSelect(prompt);

    // 聚焦到输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isExecuting) return;

    onExecute(input.trim(), selectedPrompt);
    setInput("");
    setSelectedPrompt(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedPrompt(null);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* 显示当前选中的 prompt */}
      {selectedPrompt && (
        <div className="mb-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              使用 prompt: {selectedPrompt.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPrompt(null)}
              className="h-auto p-1 text-primary hover:text-primary/80"
            >
              ✕
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedPrompt.description}
          </p>
        </div>
      )}

      {/* 输入框和发送按钮 */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedPrompt
                  ? "输入要分析的内容..."
                  : "输入消息或使用 / 快速选择 prompt..."
              }
              className="pr-4"
              disabled={isExecuting}
            />

            {/* 命令建议列表 */}
            {showSuggestions && filteredPrompts.length > 0 && (
              <Card
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto"
              >
                <CardContent className="p-2">
                  {filteredPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => handlePromptClick(prompt)}
                      className="w-full p-2 text-left rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Command className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {prompt.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {prompt.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Button
            type="submit"
            disabled={!input.trim() || isExecuting}
            size="sm"
          >
            <Send className="h-4 w-4" />
            发送
          </Button>
        </div>
      </form>

      {/* 提示文本 */}
      {!selectedPrompt && (
        <p className="text-xs text-muted-foreground mt-2">
          输入 <kbd className="px-1 py-0.5 bg-muted rounded text-xs">/</kbd>{" "}
          浏览可用的 prompt 命令
        </p>
      )}
    </div>
  );
}
