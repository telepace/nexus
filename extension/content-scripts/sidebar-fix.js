// Nexus 侧边栏修复脚本
console.log('[Nexus] 侧边栏修复脚本已加载');

// 强制显示侧边栏
function forceShowSidebar() {
  console.log('[Nexus] 尝试强制显示侧边栏');
  
  // 检查侧边栏是否存在
  let sidebarElement = document.getElementById('nexus-sidebar');
  
  if (!sidebarElement) {
    // 侧边栏不存在，创建一个简易版
    console.log('[Nexus] 侧边栏不存在，创建简易版');
    
    // 注入样式
    const style = document.createElement('style');
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
        animation: fade-in 0.3s ease;
      }
      
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      #nexus-sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        border-bottom: 1px solid #eee;
      }
      
      #nexus-sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
      }
      
      .nexus-action-button {
        background: #4f46e5;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        margin: 5px;
      }
      
      .nexus-action-row {
        display: flex;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }
    `;
    document.head.appendChild(style);
    
    // 创建侧边栏
    sidebarElement = document.createElement('div');
    sidebarElement.id = 'nexus-sidebar';
    
    // 添加头部
    const header = document.createElement('div');
    header.id = 'nexus-sidebar-header';
    header.innerHTML = `
      <div style="font-weight: bold; font-size: 16px;">Nexus AI 助手</div>
      <button id="nexus-close-button" style="background: none; border: none; cursor: pointer; font-size: 20px;">&times;</button>
    `;
    sidebarElement.appendChild(header);
    
    // 添加内容区
    const content = document.createElement('div');
    content.id = 'nexus-sidebar-content';
    content.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin-top: 0;">快速操作</h3>
        <div class="nexus-action-row">
          <button id="nexus-summarize" class="nexus-action-button">
            <span>📝</span> 总结
          </button>
          <button id="nexus-extract" class="nexus-action-button">
            <span>🔍</span> 提取要点
          </button>
          <button id="nexus-chat" class="nexus-action-button">
            <span>💬</span> 对话
          </button>
        </div>
      </div>
      
      <div style="padding: 10px; background: #f7f7f7; border-radius: 4px;">
        <p style="margin-top: 0;">这是修复版的侧边栏。如果您看到此界面，说明原始侧边栏加载失败。</p>
        <p>您仍可以使用上方的按钮来执行相应功能。</p>
      </div>
    `;
    sidebarElement.appendChild(content);
    
    // 添加到页面
    document.body.appendChild(sidebarElement);
    
    // 添加事件处理
    document.getElementById('nexus-close-button').addEventListener('click', () => {
      sidebarElement.style.right = '-400px';
      setTimeout(() => {
        sidebarElement.style.display = 'none';
      }, 300);
    });
    
    // 功能按钮点击处理
    document.getElementById('nexus-summarize').addEventListener('click', () => {
      try {
        if (window.__nexusSidebar && typeof window.__nexusSidebar.summarize === 'function') {
          window.__nexusSidebar.summarize();
        } else {
          // 备用方法：直接发送消息
          window.postMessage({
            source: "nexus-extension-content",
            action: "summarizePage"
          }, "*");
          
          content.innerHTML += `
            <div style="margin-top: 15px; padding: 10px; background: #e9f5ff; border-radius: 4px;">
              <p style="margin: 0;">正在生成页面摘要...</p>
            </div>
          `;
        }
      } catch (error) {
        console.error('[Nexus] 摘要功能错误:', error);
        alert('摘要功能调用失败');
      }
    });
    
    document.getElementById('nexus-extract').addEventListener('click', () => {
      try {
        if (window.__nexusSidebar && typeof window.__nexusSidebar.extractPoints === 'function') {
          window.__nexusSidebar.extractPoints();
        } else {
          // 备用方法：直接发送消息
          window.postMessage({
            source: "nexus-extension-content",
            action: "processPage",
            type: "highlights"
          }, "*");
          
          content.innerHTML += `
            <div style="margin-top: 15px; padding: 10px; background: #e9f5ff; border-radius: 4px;">
              <p style="margin: 0;">正在提取页面要点...</p>
            </div>
          `;
        }
      } catch (error) {
        console.error('[Nexus] 提取要点功能错误:', error);
        alert('提取要点功能调用失败');
      }
    });
    
    document.getElementById('nexus-chat').addEventListener('click', () => {
      try {
        if (window.__nexusSidebar && typeof window.__nexusSidebar.openAIChat === 'function') {
          window.__nexusSidebar.openAIChat();
        } else {
          // 备用方法：直接发送消息
          window.postMessage({
            source: "nexus-extension-content",
            action: "openAIChat"
          }, "*");
          
          content.innerHTML += `
            <div style="margin-top: 15px; padding: 10px; background: #e9f5ff; border-radius: 4px;">
              <p style="margin: 0;">正在打开AI对话...</p>
            </div>
          `;
        }
      } catch (error) {
        console.error('[Nexus] AI对话功能错误:', error);
        alert('AI对话功能调用失败');
      }
    });
    
    console.log('[Nexus] 简易侧边栏创建完成');
  } else {
    // 侧边栏存在，尝试显示
    console.log('[Nexus] 侧边栏已存在，尝试显示');
    
    // 确保可见
    sidebarElement.style.display = 'flex';
    sidebarElement.style.right = '0';
    
    if (sidebarElement.classList.contains('visible')) {
      console.log('[Nexus] 已添加visible类');
    } else {
      sidebarElement.classList.add('visible');
      console.log('[Nexus] 添加visible类');
    }
  }
}

// 在全局范围创建接口
window.__nexusSidebarFix = {
  show: forceShowSidebar
};

// 监听来自扩展的消息
window.addEventListener('message', (event) => {
  if (event.data && event.data.source === 'nexus-extension-content') {
    console.log('[Nexus Fix] 收到消息:', event.data);
    
    // 如果是显示侧边栏的消息，强制显示
    if (event.data.action === 'toggleSidebar' || 
        event.data.action === 'summarizePage' || 
        event.data.action === 'processPage' || 
        event.data.action === 'openAIChat') {
      forceShowSidebar();
    }
  }
});

// 页面加载完成后执行一次
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(function() {
    console.log('[Nexus] 页面已加载，准备修复');
    
    // 检查是否有扩展存在标志
    if (!window.__nexusSidebar || !document.getElementById('nexus-sidebar')) {
      console.log('[Nexus] 未检测到侧边栏，创建备用功能');
      
      // 创建全局备用对象
      window.__nexusSidebar = window.__nexusSidebar || {
        toggle: function(show) {
          forceShowSidebar();
          return true;
        },
        create: forceShowSidebar,
        summarize: function() {
          forceShowSidebar();
          document.getElementById('nexus-summarize').click();
        },
        extractPoints: function() {
          forceShowSidebar();
          document.getElementById('nexus-extract').click();
        },
        openAIChat: function() {
          forceShowSidebar();
          document.getElementById('nexus-chat').click();
        }
      };
    }
  }, 1000);
} else {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[Nexus] DOMContentLoaded，准备修复');
    
    setTimeout(function() {
      // 检查是否有扩展存在标志
      if (!window.__nexusSidebar || !document.getElementById('nexus-sidebar')) {
        console.log('[Nexus] 未检测到侧边栏，创建备用功能');
        
        // 创建全局备用对象
        window.__nexusSidebar = window.__nexusSidebar || {
          toggle: function(show) {
            forceShowSidebar();
            return true;
          },
          create: forceShowSidebar,
          summarize: function() {
            forceShowSidebar();
            document.getElementById('nexus-summarize').click();
          },
          extractPoints: function() {
            forceShowSidebar();
            document.getElementById('nexus-extract').click();
          },
          openAIChat: function() {
            forceShowSidebar();
            document.getElementById('nexus-chat').click();
          }
        };
      }
    }, 1000);
  });
} 