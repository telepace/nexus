"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { ReaderContent } from "./ReaderContent";

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function ReaderPage({ params }: ReaderPageProps) {
  return (
    <MainLayout>
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
    </MainLayout>
  );
}
