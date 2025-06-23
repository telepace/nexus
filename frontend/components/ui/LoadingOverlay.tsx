"use client";

import { Loading } from "@/components/ui/loading";

export const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <Loading />
  </div>
); 