"use client";

import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import ReaderLayout from "@/components/layout/ReaderLayout";
import { ReaderContent } from "./ReaderContent";

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  const [contentId, setContentId] = useState<string | null>(null);
  
  // 解析参数
  useEffect(() => {
    params.then(({ id }) => {
      setContentId(id);
    });
  }, [params]);

  if (!contentId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ReaderLayout 
      contentId={contentId}
      contentText="" // 这里可以传入内容文本，或在 ReaderContent 中获取
    >
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-lg">Loading content...</p>
            </div>
          </div>
        }
      >
        <ReaderContent params={params} />
      </Suspense>
    </ReaderLayout>
  );
}
