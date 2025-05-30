import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import SidePanelApp from './components/SidePanelApp'

// 初始化 Side Panel
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

// Plasmo 导出
export default SidePanelApp 