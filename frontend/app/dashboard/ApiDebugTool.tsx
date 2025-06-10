"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchItems } from "@/components/actions/items-action-client";
import { contentListContentItemsEndpoint } from "@/app/openapi-client/sdk.gen";

export function ApiDebugTool() {
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testFetchItems = async () => {
    setIsLoading(true);
    setDebugInfo("正在测试 fetchItems...\n");

    try {
      const result = await fetchItems();
      setDebugInfo(
        (prev) =>
          prev + `fetchItems 结果:\n${JSON.stringify(result, null, 2)}\n\n`,
      );
    } catch (error) {
      setDebugInfo((prev) => prev + `fetchItems 错误: ${error}\n\n`);
    }

    setIsLoading(false);
  };

  const testDirectApi = async () => {
    setIsLoading(true);
    setDebugInfo((prev) => prev + "正在测试直接 API 调用...\n");

    try {
      // 这需要在客户端获取token，可能需要调整
      const response = await contentListContentItemsEndpoint({
        headers: {
          // 这里可能需要不同的方式获取token
          Authorization: `Bearer ${localStorage.getItem("token") || "no-token"}`,
        },
      });

      setDebugInfo(
        (prev) =>
          prev + `直接 API 调用结果:\n${JSON.stringify(response, null, 2)}\n\n`,
      );
    } catch (error) {
      setDebugInfo((prev) => prev + `直接 API 调用错误: ${error}\n\n`);
    }

    setIsLoading(false);
  };

  const clearDebugInfo = () => {
    setDebugInfo("");
  };

  return (
    <div className="border rounded p-4 bg-gray-50" data-testid="api-debug">
      <h3 className="text-sm font-semibold mb-2">API 调试工具</h3>
      <div className="flex gap-2 mb-4">
        <Button
          onClick={testFetchItems}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          测试 fetchItems
        </Button>
        <Button
          onClick={testDirectApi}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          测试直接 API
        </Button>
        <Button onClick={clearDebugInfo} variant="outline" size="sm">
          清除
        </Button>
      </div>

      {debugInfo && (
        <div className="bg-white border rounded p-2 max-h-64 overflow-y-auto">
          <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </div>
  );
}
