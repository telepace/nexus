// 侧边栏交互逻辑
document.addEventListener('DOMContentLoaded', function() {
  console.log('侧边栏已加载');
  
  // 获取按钮和UI元素
  const summaryBtn = document.getElementById('summary-btn');
  const searchBtn = document.getElementById('search-btn');
  const contentArea = document.getElementById('content-area');
  const textarea = document.getElementById('question-input');
  const settingsBtn = document.getElementById('settings-btn');
  const helpBtn = document.getElementById('help-btn');
  const clearBtn = document.getElementById('clear-btn');
  const loginBtn = document.getElementById('login-btn');
  
  // 状态管理
  let isLoggedIn = false;
  let userDropdownOpen = false;
  
  // 摘要按钮
  if (summaryBtn) {
    summaryBtn.addEventListener('click', function() {
      contentArea.innerHTML = '<div class="py-4">正在生成内容摘要...</div>';
    });
  }
  
  // 搜索按钮
  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      contentArea.innerHTML = '<div class="py-4">搜索功能即将推出</div>';
    });
  }
  
  // 文本输入框
  if (textarea) {
    textarea.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const question = textarea.value.trim();
        if (question) {
          contentArea.innerHTML = '<div class="py-2">问题: ' + question + '</div><div class="py-2">处理中...</div>';
          textarea.value = '';
        }
      }
    });
  }
  
  // 设置按钮
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      contentArea.innerHTML = '<div class="p-4"><h3 class="font-semibold mb-3">设置</h3><div class="space-y-3"><div class="flex justify-between items-center"><span>暗色模式</span><button class="toggle-btn" data-active="false"><span class="toggle-circle"></span></button></div><div class="flex justify-between items-center"><span>自动摘要</span><button class="toggle-btn" data-active="true"><span class="toggle-circle"></span></button></div></div></div>';
      
      // 为动态添加的开关添加事件监听
      document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const active = this.getAttribute('data-active') === 'true';
          this.setAttribute('data-active', !active);
        });
      });
    });
  }
  
  // 帮助按钮
  if (helpBtn) {
    helpBtn.addEventListener('click', function() {
      contentArea.innerHTML = '<div class="p-4"><h3 class="font-semibold mb-3">帮助</h3><p class="mb-2">Nexus AI 助手可以帮您:</p><ul class="list-disc pl-5 space-y-1"><li>生成页面内容摘要</li><li>回答关于页面内容的问题</li><li>保存重要信息到您的知识库</li></ul></div>';
    });
  }
  
  // 清除按钮
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      contentArea.innerHTML = '<div class="text-muted-foreground text-center py-4">内容将在这里显示</div>';
    });
  }
  
  // 登录按钮和下拉菜单
  if (loginBtn) {
    loginBtn.addEventListener('click', function() {
      const userDropdown = document.getElementById('user-dropdown');
      if (userDropdown) {
        userDropdownOpen = !userDropdownOpen;
        userDropdown.style.display = userDropdownOpen ? 'block' : 'none';
      }
    });
    
    // 点击外部关闭下拉菜单
    document.addEventListener('click', function(e) {
      if (!e.target.closest('#login-btn') && !e.target.closest('#user-dropdown')) {
        const userDropdown = document.getElementById('user-dropdown');
        if (userDropdown) {
          userDropdown.style.display = 'none';
          userDropdownOpen = false;
        }
      }
    });
  }
  
  // 处理暗黑模式切换
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    document.body.classList.add('dark-mode');
  }
  
  // 点击切换按钮时的动画效果
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('toggle-btn') || e.target.closest('.toggle-btn')) {
      const btn = e.target.classList.contains('toggle-btn') ? e.target : e.target.closest('.toggle-btn');
      const active = btn.getAttribute('data-active') === 'true';
      btn.setAttribute('data-active', !active);
    }
  });
}); 