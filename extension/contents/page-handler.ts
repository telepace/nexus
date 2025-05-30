import type { PlasmoCSConfig } from "plasmo"
import { generateSummary, saveToLibrary } from "../lib/api"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

// 监听来自sidepanel的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'savePage') {
    handleSavePage().then(sendResponse);
    return true; // 保持消息通道开放
  } else if (message.action === 'summarize') {
    handleSummarize().then(sendResponse);
    return true; // 保持消息通道开放
  }
});

// 保存当前页面
async function handleSavePage() {
  try {
    const title = document.title;
    const url = window.location.href;
    const content = extractPageContent();
    
    const success = await saveToLibrary(title, url, content);
    
    if (success) {
      showNotification('页面已保存到内容库', 'success');
      return { success: true, message: '页面保存成功' };
    } else {
      showNotification('保存失败，请重试', 'error');
      return { success: false, message: '保存失败' };
    }
  } catch (error) {
    console.error('Save page error:', error);
    showNotification('保存失败：' + (error as Error).message, 'error');
    return { success: false, message: '保存失败' };
  }
}

// AI总结当前页面
async function handleSummarize() {
  try {
    const content = extractPageContent();
    
    if (!content || content.length < 100) {
      showNotification('页面内容太少，无法生成摘要', 'warning');
      return { success: false, message: '内容太少' };
    }
    
    showNotification('正在生成AI摘要...', 'info');
    
    const summary = await generateSummary(content);
    
    // 显示摘要结果
    showSummaryModal(summary);
    
    return { success: true, summary };
  } catch (error) {
    console.error('Summarize error:', error);
    showNotification('生成摘要失败：' + (error as Error).message, 'error');
    return { success: false, message: '生成摘要失败' };
  }
}

// 提取页面主要内容
function extractPageContent(): string {
  // 尝试获取主要内容区域
  const contentSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '#content',
    '.main-content'
  ];
  
  let content = '';
  
  // 尝试从常见的内容选择器中提取
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.textContent || '';
      if (content.length > 200) {
        break;
      }
    }
  }
  
  // 如果没有找到合适的内容，使用body
  if (!content || content.length < 200) {
    content = document.body.textContent || '';
  }
  
  // 清理内容
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
    .substring(0, 10000); // 限制长度
}

// 显示通知
function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    max-width: 300px;
  `;
  
  // 设置颜色
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  notification.style.backgroundColor = colors[type];
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // 3秒后移除
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 显示摘要模态框
function showSummaryModal(summary: string) {
  // 创建模态框
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;
  
  modalContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">AI 摘要</h3>
      <button id="nexus-close-modal" style="
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">×</button>
    </div>
    <div style="
      color: #374151;
      line-height: 1.6;
      white-space: pre-wrap;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      background: #f9fafb;
    ">${summary}</div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // 关闭模态框
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  const closeButton = modalContent.querySelector('#nexus-close-modal');
  closeButton?.addEventListener('click', closeModal);
  
  // ESC键关闭
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  
  document.addEventListener('keydown', handleEsc);
} 