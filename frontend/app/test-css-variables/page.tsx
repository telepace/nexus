"use client";

export default function TestCSSVariablesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 测试 header 高度 */}
      <header className="h-(--header-height) bg-primary text-primary-foreground flex items-center justify-center border-b">
        <h1 className="text-xl font-semibold">
          测试 Header (高度: var(--header-height))
        </h1>
      </header>

      {/* 测试内容区域 */}
      <div className="flex">
        {/* 测试 sidebar 宽度 */}
        <aside className="w-(--sidebar-width) bg-sidebar border-r">
          <div className="p-4">
            <h2 className="font-medium mb-4">
              侧边栏 (宽度: var(--sidebar-width))
            </h2>
            <ul className="space-y-2">
              <li>导航项 1</li>
              <li>导航项 2</li>
              <li>导航项 3</li>
            </ul>
          </div>
        </aside>

        {/* 主内容区域 */}
        <main className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-6">CSS 变量测试页面</h1>
          
          <div className="space-y-4">
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">可用的布局变量：</h3>
              <ul className="space-y-1 text-sm">
                <li><code className="bg-muted px-2 py-1 rounded">--header-height: 3.5rem</code></li>
                <li><code className="bg-muted px-2 py-1 rounded">--sidebar-width: 16rem</code></li>
                <li><code className="bg-muted px-2 py-1 rounded">--sidebar-width-collapsed: 3.5rem</code></li>
              </ul>
            </div>

            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">在 Tailwind 中的使用方式：</h3>
              <ul className="space-y-1 text-sm">
                <li><code className="bg-muted px-2 py-1 rounded">h-(--header-height)</code> - Header 高度</li>
                <li><code className="bg-muted px-2 py-1 rounded">w-(--sidebar-width)</code> - Sidebar 宽度</li>
                <li><code className="bg-muted px-2 py-1 rounded">w-(--sidebar-width-collapsed)</code> - 折叠的 Sidebar 宽度</li>
              </ul>
            </div>

            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">示例：</h3>
              <div className="space-y-2">
                <div className="h-(--header-height) bg-secondary rounded flex items-center justify-center">
                  <span className="text-sm">这个 div 的高度是 var(--header-height)</span>
                </div>
                <div className="w-(--sidebar-width-collapsed) h-12 bg-accent rounded flex items-center justify-center">
                  <span className="text-xs">折叠宽度</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 