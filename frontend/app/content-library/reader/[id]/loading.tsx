// 左侧阅读器面板的骨架
const LeftPanelSkeleton = () => (
  <div className="flex flex-col h-full">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between px-4 h-header border-b shrink-0">
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-muted rounded"></div>
        <div className="w-48 h-6 bg-muted rounded"></div>
      </div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
    {/* Main Content Skeleton */}
    <div className="flex-1 p-6 space-y-6">
      <div className="space-y-3">
        <div className="w-full h-4 bg-muted rounded"></div>
        <div className="w-5/6 h-4 bg-muted rounded"></div>
        <div className="w-full h-4 bg-muted rounded"></div>
        <div className="w-3/4 h-4 bg-muted rounded"></div>
      </div>
      <div className="space-y-3">
        <div className="w-4/5 h-4 bg-muted rounded"></div>
        <div className="w-full h-4 bg-muted rounded"></div>
        <div className="w-2/3 h-4 bg-muted rounded"></div>
      </div>
    </div>
  </div>
);

// 右侧 AI 分析面板的骨架
const RightPanelSkeleton = () => (
  <div className="flex flex-col h-full">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between h-header px-4 shrink-0 border-b">
      <div className="w-32 h-6 bg-muted rounded"></div>
      <div className="w-8 h-8 bg-muted rounded"></div>
    </div>
    {/* Content Body Skeleton */}
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* 推荐提示骨架 */}
      <div className="space-y-2">
        <div className="w-full h-8 bg-muted rounded"></div>
        <div className="w-full h-8 bg-muted rounded"></div>
        <div className="w-full h-8 bg-muted rounded"></div>
      </div>
      {/* 分析卡片骨架 */}
      <div className="space-y-4">
        <div className="w-full h-24 bg-muted rounded-lg"></div>
        <div className="w-full h-32 bg-muted rounded-lg"></div>
        <div className="w-full h-28 bg-muted rounded-lg"></div>
      </div>
    </div>
    {/* Footer Skeleton */}
    <div className="shrink-0 p-4 border-t">
      <div className="w-full h-10 bg-muted rounded"></div>
    </div>
  </div>
);

// Reader 布局骨架
const ReaderLayoutSkeleton = () => {
  return (
    <div className="flex min-h-screen bg-background w-screen">
      {/* 模拟左侧边栏 */}
      <div className="w-[4rem] bg-muted/20 border-r shrink-0"></div>
      {/* 主内容区域 */}
      <div className="flex-1 flex w-full min-w-0 h-screen">
        <div className="flex h-full w-full">
          {/* 左面板 */}
          <div className="w-[50%] flex flex-col">
            <LeftPanelSkeleton />
          </div>
          {/* 分割线 */}
          <div className="w-px bg-border"></div>
          {/* 右面板 */}
          <div className="w-[50%] flex flex-col">
            <RightPanelSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ReaderLoading() {
  return <ReaderLayoutSkeleton />;
}
