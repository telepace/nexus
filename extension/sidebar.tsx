import React from "react"
import { render } from "react-dom"
// 移除外部样式导入
// import "./styles/tailwind.css"
import { SidebarRoot } from "./components/Sidebar"

// 添加紧急样式表，确保基本UI可见
const addEmergencyStyles = () => {
  // 检查是否有基本的Tailwind类可用
  const isTailwindLoaded = typeof document !== 'undefined' && 
    window.getComputedStyle(document.documentElement)
      .getPropertyValue('--tw-ring-offset-width') !== '';

  if (!isTailwindLoaded && typeof document !== 'undefined') {
    console.warn('Tailwind 样式未正确加载，添加应急样式');
    
    // 添加内联应急样式
    const emergencyStyle = document.createElement('style');
    emergencyStyle.textContent = `
      .bg-background { background-color: white; }
      .bg-primary\\/5 { background-color: rgba(79, 70, 229, 0.05); }
      .bg-muted { background-color: #f3f4f6; }
      .text-foreground { color: #1f2937; }
      .text-muted-foreground { color: #6b7280; }
      .border-border { border-color: #e5e7eb; }
      
      @media (prefers-color-scheme: dark) {
        .bg-background { background-color: #1f2937; }
        .bg-primary\\/5 { background-color: rgba(99, 102, 241, 0.05); }
        .bg-muted { background-color: #374151; }
        .text-foreground { color: #f3f4f6; }
        .text-muted-foreground { color: #9ca3af; }
        .border-border { border-color: #4b5563; }
      }

      /* 基本布局样式 */
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .h-screen { height: 100vh; }
      .w-full { width: 100%; }
      .border-l { border-left-width: 1px; }
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
    `;
    document.head.appendChild(emergencyStyle);
  }

  return isTailwindLoaded;
};

// 创建容器并渲染
document.addEventListener('DOMContentLoaded', () => {
  addEmergencyStyles();
  const container = document.getElementById('__plasmo') || document.createElement("div");
  if (!document.getElementById('__plasmo')) {
    document.body.appendChild(container);
  }
  render(<SidebarRoot />, container);
});

export default SidebarRoot 