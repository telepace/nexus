/**
 * 侧边栏调试和修复脚本
 * 
 * 这个脚本会检查侧边栏中的样式是否正确加载，并在需要时注入紧急样式
 */

(function() {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDebug);
  } else {
    initializeDebug();
  }

  function initializeDebug() {
    console.log('Nexus侧边栏调试脚本已加载');

    // 直接应用紧急样式，不再检查是否加载了Tailwind CSS
    console.warn('应用侧边栏基础样式');
    applyEmergencyStyles();

    // 检查DOM结构
    checkDomStructure();
  }

  function applyEmergencyStyles() {
    // 添加基本样式类
    const style = document.createElement('style');
    style.textContent = `
      /* 基本颜色变量 */
      :root {
        --background: #ffffff;
        --foreground: #1f2937;
        --primary: #4f46e5;
        --primary-foreground: #ffffff;
        --muted: #f3f4f6;
        --muted-foreground: #6b7280;
        --border: #e5e7eb;
      }
      
      @media (prefers-color-scheme: dark) {
        :root {
          --background: #1f2937;
          --foreground: #f3f4f6;
          --primary: #6366f1;
          --primary-foreground: #ffffff;
          --muted: #374151;
          --muted-foreground: #9ca3af;
          --border: #4b5563;
        }
      }
      
      /* 基本选择器 */
      .bg-background { background-color: var(--background) !important; }
      .text-foreground { color: var(--foreground) !important; }
      .bg-primary { background-color: var(--primary) !important; }
      .text-primary { color: var(--primary) !important; }
      .bg-muted { background-color: var(--muted) !important; }
      .text-muted-foreground { color: var(--muted-foreground) !important; }
      .border-border { border-color: var(--border) !important; }
      
      /* 布局类 */
      .flex { display: flex !important; }
      .flex-col { flex-direction: column !important; }
      .items-center { align-items: center !important; }
      .justify-between { justify-content: space-between !important; }
      .h-screen { height: 100vh !important; }
      .w-full { width: 100% !important; }
      .p-4 { padding: 1rem !important; }
      .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
      .gap-2 { gap: 0.5rem !important; }
      .gap-4 { gap: 1rem !important; }

      /* 边框 */
      .border { border-width: 1px !important; }
      .border-t { border-top-width: 1px !important; }
      .border-b { border-bottom-width: 1px !important; }
      .rounded { border-radius: 0.25rem !important; }
      .rounded-md { border-radius: 0.375rem !important; }
      
      /* 其他 */
      .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important; }
      .overflow-y-auto { overflow-y: auto !important; }
      .flex-1 { flex: 1 1 0% !important; }
    `;
    document.head.appendChild(style);
    
    // 添加调试指示器
    const debugIndicator = document.createElement('div');
    debugIndicator.style.position = 'fixed';
    debugIndicator.style.bottom = '10px';
    debugIndicator.style.right = '10px';
    debugIndicator.style.backgroundColor = 'green';
    debugIndicator.style.color = 'white';
    debugIndicator.style.padding = '5px';
    debugIndicator.style.fontSize = '10px';
    debugIndicator.style.borderRadius = '3px';
    debugIndicator.style.zIndex = '9999';
    debugIndicator.textContent = '基础样式已加载';
    document.body.appendChild(debugIndicator);
  }

  function checkDomStructure() {
    // 检查侧边栏根元素
    const sidebarRoot = document.querySelector('[data-testid="native-sidebar-root"]') || 
                         document.querySelector('[data-testid="sidebar-root"]');
    
    if (!sidebarRoot) {
      console.error('未找到侧边栏根元素');
      createEmergencyUI();
    } else {
      console.log('侧边栏根元素已找到');
    }
  }

  function createEmergencyUI() {
    console.warn('创建应急UI');
    
    // 检查是否已有__plasmo元素
    const plasmoContainer = document.getElementById('__plasmo');
    if (!plasmoContainer) {
      console.error('未找到#__plasmo容器');
      return;
    }
    
    // 创建基本UI结构
    const emergencyUI = document.createElement('div');
    emergencyUI.className = 'h-screen w-full bg-background flex flex-col';
    emergencyUI.innerHTML = `
      <div class="p-4 border-b border-border flex items-center justify-between">
        <div class="font-semibold">Nexus AI 助手</div>
      </div>
      <div class="p-4 border-b border-border">
        <div class="flex gap-2">
          <button class="px-4 py-2 bg-primary text-primary-foreground rounded">摘要</button>
          <button class="px-4 py-2 bg-muted text-muted-foreground rounded">搜索</button>
        </div>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <div class="text-muted-foreground text-center py-4">
          内容将在这里显示
        </div>
      </div>
      <div class="p-4 border-t border-border">
        <div class="border rounded-md p-2 bg-muted">
          <textarea placeholder="输入您的问题..." class="w-full bg-transparent outline-none"></textarea>
        </div>
      </div>
    `;
    
    plasmoContainer.appendChild(emergencyUI);
  }
})(); 