import type { PlasmoCSConfig } from "plasmo";
import { sendToBackground } from "@plasmohq/messaging";

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  all_frames: false
};

// 提取页面主要内容
function extractPageContent(): string {
  // 移除脚本和样式标签
  const scripts = document.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());
  
  // 尝试获取主要内容区域
  const contentSelectors = [
    'main',
    'article', 
    '[role="main"]',
    '.content',
    '.main-content',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
    '#main'
  ];
  
  let content = '';
  
  // 按优先级尝试选择器
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.innerText || element.textContent || '';
      break;
    }
  }
  
  // 如果没有找到主要内容区域，使用 body
  if (!content) {
    content = document.body.innerText || document.body.textContent || '';
  }
  
  // 清理内容
  return content
    .replace(/\s+/g, ' ') // 合并多个空白字符
    .replace(/\n\s*\n/g, '\n') // 移除多余的换行
    .trim()
    .substring(0, 50000); // 限制长度
}

// 获取页面信息
function getPageInfo() {
  return {
    title: document.title,
    url: window.location.href,
    content: extractPageContent(),
    timestamp: Date.now()
  };
}

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name === "page-loaded") {
    // 页面加载完成，提取内容
    const pageInfo = getPageInfo();
    console.log("Page content extracted:", pageInfo.title);
    
    // 发送到 background
    sendToBackground({
      name: "page-content",
      body: pageInfo
    });
  }
  
  if (message.type === "EXTRACT_CONTENT") {
    // 手动提取内容请求
    const pageInfo = getPageInfo();
    sendResponse(pageInfo);
  }
});

// 页面加载完成时自动提取内容
if (document.readyState === 'complete') {
  setTimeout(() => {
    const pageInfo = getPageInfo();
    sendToBackground({
      name: "page-content", 
      body: pageInfo
    });
  }, 1000);
} else {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const pageInfo = getPageInfo();
      sendToBackground({
        name: "page-content",
        body: pageInfo
      });
    }, 1000);
  });
}

console.log("Nexus Content Extractor Initialized"); 