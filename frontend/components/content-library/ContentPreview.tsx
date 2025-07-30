"use client";

import React from "react";
import type { ContentItemPublic } from "./types";
import { ContentAnalysisView } from "@/components/ai/ContentAnalysisView";

interface Props {
  item: ContentItemPublic | null;
}

export const ContentPreview = ({ item }: Props) => {
  return (
    <ContentAnalysisView
      item={item}
      variant="preview"
      seamless={true}
      emptyStateText="选择内容进行预览"
    />
  );
};