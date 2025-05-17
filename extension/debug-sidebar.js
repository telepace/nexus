// Nexus 侧边栏诊断工具
// 在控制台中运行此脚本以诊断侧边栏问题

(function diagnoseSidebar() {
  console.log('%c[Nexus诊断] 开始侧边栏诊断', 'color: blue; font-weight: bold');
  
  // 检查1: 全局对象是否存在
  const nexusSidebarExists = typeof window.__nexusSidebar !== 'undefined';
  console.log(`%c[检查1] __nexusSidebar对象${nexusSidebarExists ? '存在 ✓' : '不存在 ✗'}`, 
    nexusSidebarExists ? 'color: green' : 'color: red');
  
  if (nexusSidebarExists) {
    console.log('__nexusSidebar对象内容:', window.__nexusSidebar);
  }
  
  // 检查2: 侧边栏DOM元素是否存在
  const sidebarElement = document.getElementById('nexus-sidebar');
  console.log(`%c[检查2] nexus-sidebar DOM元素${sidebarElement ? '存在 ✓' : '不存在 ✗'}`, 
    sidebarElement ? 'color: green' : 'color: red');
  
  if (sidebarElement) {
    console.log('侧边栏样式:', {
      display: getComputedStyle(sidebarElement).display,
      visibility: getComputedStyle(sidebarElement).visibility,
      position: getComputedStyle(sidebarElement).position,
      right: getComputedStyle(sidebarElement).right,
      zIndex: getComputedStyle(sidebarElement).zIndex,
      width: getComputedStyle(sidebarElement).width,
      height: getComputedStyle(sidebarElement).height
    });
  }
  
  // 检查3: React根元素是否存在
  const reactRoot = document.getElementById('nexus-sidebar-root');
  console.log(`%c[检查3] nexus-sidebar-root React根元素${reactRoot ? '存在 ✓' : '不存在 ✗'}`, 
    reactRoot ? 'color: green' : 'color: red');
  
  // 检查4: 样式是否被正确注入
  const styleElement = document.getElementById('nexus-sidebar-styles');
  console.log(`%c[检查4] nexus-sidebar-styles 样式${styleElement ? '存在 ✓' : '不存在 ✗'}`, 
    styleElement ? 'color: green' : 'color: red');
  
  // 尝试修复: 如果侧边栏不存在，尝试创建
  if (!sidebarElement) {
    console.log('%c[修复] 尝试创建侧边栏...', 'color: purple');
    
    try {
      // 检查是否有全局方法可用
      if (nexusSidebarExists && typeof window.__nexusSidebar.create === 'function') {
        window.__nexusSidebar.create();
        console.log('%c[修复] 使用 __nexusSidebar.create() 创建侧边栏', 'color: purple');
      } else {
        // 注入一个临时的侧边栏
        console.log('%c[修复] 创建临时侧边栏元素', 'color: purple');
        
        // 创建样式
        if (!styleElement) {
          const style = document.createElement('style');
          style.id = 'nexus-sidebar-styles';
          style.textContent = `
            #nexus-sidebar {
              position: fixed;
              top: 0;
              right: 0;
              width: 400px;
              height: 100vh;
              z-index: 2147483647;
              background: white;
              box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
            }
          `;
          document.head.appendChild(style);
        }
        
        // 创建侧边栏
        const sidebar = document.createElement('div');
        sidebar.id = 'nexus-sidebar';
        sidebar.innerHTML = `
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 10px;">
            <h2 style="margin: 0; font-size: 18px;">Nexus 诊断</h2>
            <button id="nexus-sidebar-close" style="background: none; border: none; cursor: pointer; font-size: 20px;">&times;</button>
          </div>
          <div style="flex: 1; overflow-y: auto; padding: 20px;">
            <p style="font-weight: bold; color: #4f46e5;">侧边栏诊断结果</p>
            <ul style="padding-left: 20px;">
              <li>__nexusSidebar对象: ${nexusSidebarExists ? '存在 ✓' : '不存在 ✗'}</li>
              <li>nexus-sidebar元素: 原先不存在，已创建 ✓</li>
              <li>样式元素: ${styleElement ? '存在 ✓' : '已创建 ✓'}</li>
            </ul>
            <div style="margin-top: 20px; padding: 10px; background: #f2f2f2; border-radius: 4px;">
              <p>以下功能按钮可以测试侧边栏的各项功能是否正常：</p>
              <div style="display: flex; gap: 10px; margin-top: 10px;">
                <button id="test-summarize" style="background: #4f46e5; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">测试摘要</button>
                <button id="test-extract" style="background: #4f46e5; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">测试提取</button>
                <button id="test-chat" style="background: #4f46e5; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">测试对话</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(sidebar);
        
        // 添加关闭按钮事件
        document.getElementById('nexus-sidebar-close').addEventListener('click', () => {
          sidebar.remove();
        });
        
        // 添加测试按钮事件
        document.getElementById('test-summarize').addEventListener('click', () => {
          if (nexusSidebarExists && typeof window.__nexusSidebar.summarize === 'function') {
            window.__nexusSidebar.summarize();
          } else {
            alert('无法执行摘要功能，__nexusSidebar.summarize方法不存在');
          }
        });
        
        document.getElementById('test-extract').addEventListener('click', () => {
          if (nexusSidebarExists && typeof window.__nexusSidebar.extractPoints === 'function') {
            window.__nexusSidebar.extractPoints();
          } else {
            alert('无法执行提取功能，__nexusSidebar.extractPoints方法不存在');
          }
        });
        
        document.getElementById('test-chat').addEventListener('click', () => {
          if (nexusSidebarExists && typeof window.__nexusSidebar.openAIChat === 'function') {
            window.__nexusSidebar.openAIChat();
          } else {
            alert('无法执行对话功能，__nexusSidebar.openAIChat方法不存在');
          }
        });
      }
      
      // 再次检查
      setTimeout(() => {
        const updatedSidebar = document.getElementById('nexus-sidebar');
        console.log(`%c[修复] 侧边栏${updatedSidebar ? '已创建 ✓' : '创建失败 ✗'}`, 
          updatedSidebar ? 'color: green' : 'color: red');
      }, 500);
      
    } catch (error) {
      console.error('[修复] 创建侧边栏失败:', error);
    }
  } else {
    // 如果侧边栏已存在但不可见，尝试修复
    if (sidebarElement.style.right !== '0px') {
      console.log('%c[修复] 侧边栏存在但不可见，尝试显示', 'color: purple');
      
      try {
        if (nexusSidebarExists && typeof window.__nexusSidebar.toggle === 'function') {
          window.__nexusSidebar.toggle(true);
          console.log('%c[修复] 使用 __nexusSidebar.toggle(true) 显示侧边栏', 'color: purple');
        } else {
          sidebarElement.style.right = '0px';
          sidebarElement.classList.add('visible');
          console.log('%c[修复] 直接修改样式显示侧边栏', 'color: purple');
        }
      } catch (error) {
        console.error('[修复] 显示侧边栏失败:', error);
      }
    }
  }
  
  // 提供使用说明
  console.log('%c[Nexus诊断] 诊断完成', 'color: blue; font-weight: bold');
  console.log('%c如果侧边栏仍然不可见，请尝试在控制台运行以下命令:', 'color: blue');
  console.log('%c1. window.__nexusSidebar && window.__nexusSidebar.create()', 'color: blue');
  console.log('%c2. window.__nexusSidebar && window.__nexusSidebar.toggle(true)', 'color: blue');
  console.log('%c或者运行 document.getElementById("nexus-sidebar").style.right = "0px"', 'color: blue');
})(); 