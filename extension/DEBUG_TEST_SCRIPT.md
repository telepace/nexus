# 插件调试测试脚本

## 🔍 快速诊断步骤

### 1. 基础环境检查

在浏览器控制台运行以下命令：

```javascript
// 检查插件是否加载
console.log('Extension context:', typeof chrome !== 'undefined' && chrome.runtime ? '✅ 正常' : '❌ 异常');

// 检查存储状态
chrome.storage.local.get(['accessToken', 'user'], (result) => {
  console.log('🔐 认证状态:', {
    hasToken: !!result.accessToken,
    tokenLength: result.accessToken?.length || 0,
    hasUser: !!result.user,
    userEmail: result.user?.email || 'N/A'
  });
});

// 检查API连接
fetch('http://localhost:8000/api/v1/users/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken') || 'TEST_TOKEN'}`
  }
}).then(r => console.log('🌐 API状态:', r.status, r.statusText)).catch(e => console.log('🌐 API错误:', e.message));
```

### 2. Content Script 状态检查

```javascript
// 检查当前页面的content script
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  if (tabs[0]) {
    chrome.tabs.sendMessage(tabs[0].id, {type: 'PING'}, (response) => {
      if (chrome.runtime.lastError) {
        console.log('📄 Content Script: ❌ 未加载 -', chrome.runtime.lastError.message);
        console.log('💡 解决方案: 刷新页面 (F5) 重新注入脚本');
      } else {
        console.log('📄 Content Script: ✅ 正常 -', response);
      }
    });
  }
});
```

### 3. 认证流程测试

```javascript
// 测试完整的认证流程
async function testAuthFlow() {
  console.log('🔄 开始认证流程测试...');
  
  // 1. 检查本地存储
  const storage = await chrome.storage.local.get(['accessToken', 'user']);
  console.log('1️⃣ 存储检查:', storage);
  
  if (!storage.accessToken) {
    console.log('❌ 未找到token，需要重新登录');
    return;
  }
  
  // 2. 测试API调用
  try {
    const response = await fetch('http://localhost:8000/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${storage.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('2️⃣ API测试:', response.status, response.statusText);
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ 认证正常:', userData.email);
    } else {
      console.log('❌ 认证失败，需要重新登录');
    }
  } catch (error) {
    console.log('❌ API连接失败:', error.message);
  }
}

testAuthFlow();
```

### 4. 保存功能测试

```javascript
// 模拟保存流程测试
async function testSaveFlow() {
  console.log('💾 开始保存流程测试...');
  
  // 1. 检查页面数据
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) {
      console.log('❌ 无法获取当前标签页');
      return;
    }
    
    // 2. 测试content script连接
    chrome.tabs.sendMessage(tabs[0].id, {type: 'EXTRACT_CONTENT'}, (response) => {
      if (chrome.runtime.lastError) {
        console.log('❌ Content script连接失败:', chrome.runtime.lastError.message);
        console.log('💡 请刷新页面后重试');
        return;
      }
      
      if (response?.success) {
        console.log('✅ 页面数据提取成功:', {
          title: response.data.title,
          contentLength: response.data.content?.length || 0,
          url: response.data.url
        });
        
        // 3. 测试保存请求
        chrome.tabs.sendMessage(tabs[0].id, {type: 'SAVE_PAGE'}, (saveResponse) => {
          if (chrome.runtime.lastError) {
            console.log('❌ 保存请求失败:', chrome.runtime.lastError.message);
          } else {
            console.log('💾 保存结果:', saveResponse);
          }
        });
      } else {
        console.log('❌ 页面数据提取失败:', response?.error);
      }
    });
  });
}

testSaveFlow();
```

## 🚨 常见问题解决方案

### 问题1: "页面内容脚本未加载"
**解决方案**: 刷新当前页面 (F5 或 Ctrl+R)

### 问题2: "认证状态正常但保存失败"
**解决方案**: 
1. 运行认证流程测试
2. 如果API返回401，点击"退出登录"后重新登录

### 问题3: "消息端口关闭错误"
**解决方案**: 
1. 重新加载插件 (`chrome://extensions/`)
2. 刷新页面

## 📊 成功状态检查清单

- [ ] 🔐 Token存在且有效
- [ ] 🌐 API连接正常 (200状态)
- [ ] 📄 Content script已加载
- [ ] 💾 保存流程完整运行

## 🔧 重置插件状态

```javascript
// 完全重置插件状态
chrome.storage.local.clear(() => {
  console.log('🔄 插件存储已清除，请重新登录');
  location.reload();
});
``` 