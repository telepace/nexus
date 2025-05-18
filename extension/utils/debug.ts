export const debugLog = (message: string, data?: any) => {
  if (process.env.PLASMO_PUBLIC_DEBUG_MODE === 'true') {
    console.log(`[Nexus Debug] ${message}`, data);
  }
};

export const styleDebug = () => {
  if (process.env.PLASMO_PUBLIC_DEBUG_MODE === 'true' && typeof document !== 'undefined') {
    // 添加调试样式指示器
    const debugElement = document.createElement('div');
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '5px';
    debugElement.style.right = '5px';
    debugElement.style.padding = '3px 6px';
    debugElement.style.fontSize = '10px';
    debugElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugElement.style.color = 'white';
    debugElement.style.borderRadius = '3px';
    debugElement.style.zIndex = '9999';
    debugElement.textContent = 'Styles OK';
    
    // 检查关键样式是否正常
    const hasBackground = getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)';
    if (!hasBackground) {
      debugElement.textContent = 'Style Issue';
      debugElement.style.backgroundColor = 'red';
    }
    
    document.body.appendChild(debugElement);
    return hasBackground;
  }
  return true;
};

// 添加CSS加载检查，显示当前是否成功加载了样式
export const checkCssLoaded = () => {
  if (typeof document !== 'undefined') {
    // 检查是否有任何样式表被加载
    const styleSheets = document.styleSheets;
    const debugElement = document.createElement('div');
    debugElement.style.position = 'fixed';
    debugElement.style.bottom = '25px';
    debugElement.style.right = '5px';
    debugElement.style.padding = '3px 6px';
    debugElement.style.fontSize = '10px';
    debugElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugElement.style.color = 'white';
    debugElement.style.borderRadius = '3px';
    debugElement.style.zIndex = '9999';
    
    let tailwindFound = false;
    
    // 遍历所有样式表，查找 tailwind 相关
    for (let i = 0; i < styleSheets.length; i++) {
      try {
        const href = styleSheets[i].href || '';
        if (href.includes('tailwind')) {
          tailwindFound = true;
          break;
        }
      } catch (e) {
        // 可能因为跨域限制无法访问某些样式表
        continue;
      }
    }
    
    debugElement.textContent = tailwindFound ? 'Tailwind CSS: 已加载' : 'Tailwind CSS: 未加载';
    
    if (!tailwindFound) {
      debugElement.style.backgroundColor = 'red';
      // 尝试动态加载 Tailwind CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/styles/tailwind.css';
      document.head.appendChild(link);
      
      // 添加内联的基本样式，以防万一
      const inlineStyle = document.createElement('style');
      inlineStyle.textContent = `
        body { 
          background-color: var(--background, #ffffff);
          color: var(--foreground, #1f2937); 
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: var(--background, #1f2937);
            color: var(--foreground, #f3f4f6);
          }
        }
      `;
      document.head.appendChild(inlineStyle);
    }
    
    document.body.appendChild(debugElement);
    return tailwindFound;
  }
  return false;
};
