"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/client-auth";

// 后端生成的已知有效token，这应该在生产环境中移除
const KNOWN_GOOD_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NDgzNTY1NjMsInN1YiI6IjAzOTQxMzFhLTdkZTQtNGE1ZC05MzE4LTZmMjU2MDQ2NDhiYSJ9.wm_Mxp5U_n5k3i51CKshBPkJUPFGZpqPwT2Ep0ZooMY";

export function TokenDebugTool() {
  const { setCustomToken } = useAuth();
  const [customToken, setCustomTokenInput] = useState("");

  return (
    <div className="space-y-2" data-testid="token-debug">
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomToken(KNOWN_GOOD_TOKEN)}
        >
          使用已知有效Token
        </Button>
      </div>

      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="输入自定义Token"
          value={customToken}
          onChange={(e) => setCustomTokenInput(e.target.value)}
          className="text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => customToken && setCustomToken(customToken)}
        >
          设置
        </Button>
      </div>

      <div className="text-xs text-gray-500 mt-1">
        注意：此工具仅用于开发环境中测试认证问题
      </div>
    </div>
  );
}
