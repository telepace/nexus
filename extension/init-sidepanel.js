// 检查样式是否正确加载
window.addEventListener('load', function() {
  // 不再检查外部样式，而是使用内联样式
  console.log('使用内联样式代替外部Tailwind引用');
  
  // 创建基本UI作为后备
  const plasmoContainer = document.getElementById('__plasmo');
  if (plasmoContainer && !plasmoContainer.hasChildNodes()) {
    console.warn('创建应急UI');
    
    // 创建主容器
    const emergencyUI = document.createElement('div');
    emergencyUI.className = 'h-screen w-full bg-background flex flex-col';
    
    // 创建头部
    const header = document.createElement('div');
    header.className = 'p-4 border-b border-border flex items-center justify-between';
    const title = document.createElement('div');
    title.className = 'font-semibold';
    title.textContent = 'Nexus AI 助手';
    header.appendChild(title);
    
    // 创建操作栏
    const actions = document.createElement('div');
    actions.className = 'p-4 border-b border-border';
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'flex gap-2';
    
    const summaryBtn = document.createElement('button');
    summaryBtn.className = 'px-4 py-2 bg-primary text-primary-foreground rounded';
    summaryBtn.textContent = '摘要';
    
    const searchBtn = document.createElement('button');
    searchBtn.className = 'px-4 py-2 bg-muted text-muted-foreground rounded';
    searchBtn.textContent = '搜索';
    
    buttonGroup.appendChild(summaryBtn);
    buttonGroup.appendChild(searchBtn);
    actions.appendChild(buttonGroup);
    
    // 创建内容区域
    const content = document.createElement('div');
    content.className = 'flex-1 overflow-y-auto p-4';
    const placeholder = document.createElement('div');
    placeholder.className = 'text-muted-foreground text-center py-4';
    placeholder.textContent = '内容将在这里显示';
    content.appendChild(placeholder);
    
    // 创建底部输入区
    const footer = document.createElement('div');
    footer.className = 'p-4 border-t border-border';
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'border rounded-md p-2 bg-muted';
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full bg-transparent outline-none';
    textarea.placeholder = '输入您的问题...';
    inputWrapper.appendChild(textarea);
    footer.appendChild(inputWrapper);
    
    // 组装UI
    emergencyUI.appendChild(header);
    emergencyUI.appendChild(actions);
    emergencyUI.appendChild(content);
    emergencyUI.appendChild(footer);
    
    // 添加到容器
    plasmoContainer.appendChild(emergencyUI);
  }
}); 