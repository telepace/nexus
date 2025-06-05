import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css'
import SidePanelApp from './components/SidePanelApp'

// 初始化 Side Panel - 直接使用改进后的 SidePanelApp
function init() {
  const rootElement = document.getElementById('__plasmo')
  if (rootElement) {
    const root = createRoot(rootElement)
    root.render(<SidePanelApp />)
  }
}

// DOM 准备完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// Plasmo 导出 - 导出我们的新组件
export default SidePanelApp 