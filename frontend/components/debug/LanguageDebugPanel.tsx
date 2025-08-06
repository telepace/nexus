/**
 * 语言检测调试面板
 * 用于调试多语言功能
 */

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { detectLocale } from "@/lib/i18n";

export function LanguageDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>("");

  useEffect(() => {
    // 收集调试信息
    const info = {
      navigatorLanguage:
        typeof navigator !== "undefined" ? navigator.language : "N/A",
      navigatorLanguages:
        typeof navigator !== "undefined" ? navigator.languages : [],
      localStorageLanguage:
        typeof localStorage !== "undefined"
          ? localStorage.getItem("preferred-language")
          : null,
      detectedLocale: detectLocale(),
      currentURL: typeof window !== "undefined" ? window.location.href : "N/A",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
    };
    setDebugInfo(info);
  }, []);

  const testLanguageAPI = async () => {
    const locale = detectLocale();
    const outputLanguage = locale === "en" ? "English" : "Chinese";

    setTestResult(
      `
检测到的语言代码: ${locale}
发送给API的语言: ${outputLanguage}
浏览器语言: ${debugInfo.navigatorLanguage}
浏览器语言列表: ${JSON.stringify(debugInfo.navigatorLanguages)}
本地存储语言: ${debugInfo.localStorageLanguage || "null"}
    `.trim(),
    );
  };

  const changeLanguage = (lang: string) => {
    localStorage.setItem("preferred-language", lang);
    window.location.reload(); // 刷新页面以应用新语言
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🌐 语言检测调试面板</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 当前检测信息 */}
        <div className="space-y-2">
          <h3 className="font-semibold">当前检测信息:</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              浏览器语言:{" "}
              <Badge variant="outline">{debugInfo.navigatorLanguage}</Badge>
            </div>
            <div>
              检测到的语言:{" "}
              <Badge variant="outline">{debugInfo.detectedLocale}</Badge>
            </div>
            <div>
              本地存储:{" "}
              <Badge variant="outline">
                {debugInfo.localStorageLanguage || "未设置"}
              </Badge>
            </div>
            <div>
              API语言参数:{" "}
              <Badge variant="outline">
                {debugInfo.detectedLocale === "en" ? "English" : "Chinese"}
              </Badge>
            </div>
          </div>
        </div>

        {/* 浏览器语言列表 */}
        <div className="space-y-2">
          <h3 className="font-semibold">浏览器支持的语言:</h3>
          <div className="flex flex-wrap gap-1">
            {debugInfo.navigatorLanguages?.map(
              (lang: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {lang}
                </Badge>
              ),
            )}
          </div>
        </div>

        {/* 语言切换测试 */}
        <div className="space-y-2">
          <h3 className="font-semibold">手动设置语言测试:</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeLanguage("en")}
            >
              设置为英文
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeLanguage("zh")}
            >
              设置为中文
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem("preferred-language");
                window.location.reload();
              }}
            >
              清除设置
            </Button>
          </div>
        </div>

        {/* API测试 */}
        <div className="space-y-2">
          <h3 className="font-semibold">API参数模拟测试:</h3>
          <Button onClick={testLanguageAPI} className="w-full">
            测试语言检测
          </Button>
          {testResult && (
            <pre className="text-xs bg-gray-100 p-3 rounded border overflow-auto">
              {testResult}
            </pre>
          )}
        </div>

        {/* 使用说明 */}
        <div className="text-xs text-gray-500 space-y-1 border-t pt-2">
          <p>
            <strong>使用说明:</strong>
          </p>
          <p>• 打开浏览器开发者工具查看控制台日志</p>
          <p>• 检查前端是否正确检测到浏览器语言</p>
          <p>• 验证API请求是否传递正确的output_language参数</p>
          <p>• 在Network标签中查看实际的API请求内容</p>
        </div>

        {/* 当前URL信息 */}
        <div className="text-xs text-gray-400">
          <p>当前URL: {debugInfo.currentURL}</p>
        </div>
      </CardContent>
    </Card>
  );
}
