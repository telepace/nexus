"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getCookie } from "cookies-next";

interface AILanguageSettingsProps {
  className?: string;
}

interface UserSettings {
  ai_output_language: string;
  auto_generate_summary: boolean;
  auto_generate_key_points: boolean;
  auto_generate_labels: boolean;
  preferred_analysis_model?: string;
  max_summary_length: number;
}

const SUPPORTED_LANGUAGES = [
  { code: "English", name: "英语", flag: "🇺🇸" },
  { code: "Chinese", name: "中文", flag: "🇨🇳" },
  { code: "Japanese", name: "日语", flag: "🇯🇵" },
  { code: "Korean", name: "韩语", flag: "🇰🇷" },
  { code: "French", name: "法语", flag: "🇫🇷" },
  { code: "German", name: "德语", flag: "🇩🇪" },
  { code: "Spanish", name: "西班牙语", flag: "🇪🇸" },
];

export function AILanguageSettings({ className }: AILanguageSettingsProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 获取用户设置
  const fetchUserSettings = useCallback(async () => {
    try {
      const token = getCookie("accessToken");
      if (!token) {
        throw new Error("未找到认证令牌");
      }

      const response = await fetch("/api/v1/user-settings/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("获取用户设置失败");
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error("获取用户设置失败:", error);
      toast({
        title: "获取设置失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 更新 AI 输出语言
  const updateAILanguage = async (language: string) => {
    setSaving(true);
    try {
      const token = getCookie("accessToken");
      if (!token) {
        throw new Error("未找到认证令牌");
      }

      const response = await fetch("/api/v1/user-settings/ai-language", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ai_output_language: language,
        }),
      });

      if (!response.ok) {
        throw new Error("更新语言设置失败");
      }

      const data = await response.json();

      // 更新本地状态
      setSettings((prev) =>
        prev ? { ...prev, ai_output_language: language } : null,
      );

      toast({
        title: "设置已更新",
        description: `AI 输出语言已设置为 ${SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name}`,
      });

      console.log("🌐 AI 语言设置已更新:", data);
    } catch (error) {
      console.error("更新语言设置失败:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // 更新其他设置
  const updateSettings = async (updates: Partial<UserSettings>) => {
    setSaving(true);
    try {
      const token = getCookie("accessToken");
      if (!token) {
        throw new Error("未找到认证令牌");
      }

      const response = await fetch("/api/v1/user-settings/", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("更新设置失败");
      }

      const data = await response.json();
      setSettings(data);

      toast({
        title: "设置已更新",
        description: "您的偏好设置已成功保存",
      });
    } catch (error) {
      console.error("更新设置失败:", error);
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchUserSettings();
  }, [fetchUserSettings]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>AI 输出设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>AI 输出设置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">无法加载用户设置</p>
          <Button onClick={fetchUserSettings} className="mt-2">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === settings.ai_output_language,
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌐 AI 输出设置
          <Badge variant="secondary">独立于界面语言</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          设置 AI 分析、摘要、标签等功能的输出语言
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI 输出语言设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">AI 输出语言</label>
            {currentLanguage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{currentLanguage.flag}</span>
                <span>当前: {currentLanguage.name}</span>
              </div>
            )}
          </div>

          <Select
            value={settings.ai_output_language}
            onValueChange={updateAILanguage}
            disabled={saving}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择 AI 输出语言" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  <div className="flex items-center gap-2">
                    <span>{language.flag}</span>
                    <span>{language.name}</span>
                    <span className="text-muted-foreground">
                      ({language.code})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p className="text-xs text-muted-foreground">
            💡 此设置将影响所有 AI
            功能的输出语言，包括内容分析、摘要生成、标签提取等
          </p>
        </div>

        <Separator />

        {/* 自动生成设置 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">自动生成功能</h4>

          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-sm">自动生成摘要</span>
              <input
                type="checkbox"
                checked={settings.auto_generate_summary}
                onChange={(e) =>
                  updateSettings({ auto_generate_summary: e.target.checked })
                }
                disabled={saving}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">自动生成要点</span>
              <input
                type="checkbox"
                checked={settings.auto_generate_key_points}
                onChange={(e) =>
                  updateSettings({ auto_generate_key_points: e.target.checked })
                }
                disabled={saving}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">自动生成标签</span>
              <input
                type="checkbox"
                checked={settings.auto_generate_labels}
                onChange={(e) =>
                  updateSettings({ auto_generate_labels: e.target.checked })
                }
                disabled={saving}
                className="rounded"
              />
            </label>
          </div>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span>保存中...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
