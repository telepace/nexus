"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import * as React from "react";

interface CopyToClipboardButtonProps {
  content: string;
}

export function CopyToClipboardButton({ content }: CopyToClipboardButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(content);
        // Optionally, show a toast notification here
      }}
    >
      <Copy className="h-4 w-4 mr-2" />
      复制内容
    </Button>
  );
}
