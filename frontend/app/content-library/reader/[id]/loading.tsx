"use client";

/**
 * Reader 页面初始骨架：直接呈现左右两栏布局，避免加载阶段的跳闪。
 * 左右栏都使用同样的视觉占位，保持最终结构一致。
 */
export default function ReaderPageLoading() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 左栏骨架 */}
      <div className="flex-1 flex flex-col animate-pulse bg-background/60">
        {/* Header */}
        <div className="h-header border-b bg-muted/30" />
        {/* Content */}
        <div className="flex-1 bg-muted/10" />
      </div>

      {/* 右栏骨架 */}
      <div className="flex-1 flex flex-col animate-pulse bg-background/60 border-l">
        {/* Header */}
        <div className="h-header border-b bg-muted/30" />
        {/* Content */}
        <div className="flex-1 bg-muted/10" />
      </div>
    </div>
  );
}
