// 骨架屏组件
const ReaderSkeleton = () => {
  return (
    <div className="h-full flex flex-col p-2 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center space-x-4">
          <div className="w-24 h-8 bg-muted rounded"></div>
          <div>
            <div className="w-64 h-8 bg-muted rounded mb-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-5 bg-muted rounded"></div>
              <div className="w-16 h-5 bg-muted rounded"></div>
              <div className="w-20 h-5 bg-muted rounded"></div>
            </div>
          </div>
        </div>
        <div className="w-20 h-8 bg-muted rounded"></div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-6">
        {/* Tabs Skeleton */}
        <div className="flex space-x-1 mb-4">
          <div className="w-24 h-10 bg-muted rounded"></div>
          <div className="w-20 h-10 bg-muted rounded"></div>
        </div>

        {/* Content Area Skeleton */}
        <div className="space-y-4">
          {/* 模拟文章内容的骨架 */}
          <div className="space-y-3">
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
            <div className="w-4/5 h-4 bg-muted rounded"></div>
          </div>

          <div className="space-y-3">
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-3/4 h-4 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
            <div className="w-2/3 h-4 bg-muted rounded"></div>
          </div>

          <div className="space-y-3">
            <div className="w-4/5 h-4 bg-muted rounded"></div>
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-3/5 h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Loading() {
  return <ReaderSkeleton />;
}
