# 认证状态不一致问题诊断脚本

## 🎯 专门诊断认证逻辑不一致问题

### 📋 完整认证状态对比测试

```javascript
// 🔍 认证状态对比诊断
async function diagnoseAuthInconsistency() {
  console.log('🔄 开始认证状态一致性诊断...\n');
  
  let frontendResult, backgroundResult;
  
  // 1. 检查本地存储状态
  console.log('📦 1. 检查本地存储状态:');
  const storage = await chrome.storage.local.get(['accessToken', 'user']);
  console.log('   Token存在:', !!storage.accessToken);
  console.log('   Token长度:', storage.accessToken?.length || 0);
  console.log('   用户邮箱:', storage.user?.email || 'N/A');
  console.log('   Token前缀:', storage.accessToken?.substring(0, 20) + '...' || 'N/A');
  
  if (!storage.accessToken) {
    console.log('❌ 未找到token，请先登录');
    return;
  }
  
  // 2. 前端认证检查（调试按钮逻辑）
  console.log('\n🖥️ 2. 前端认证检查 (调试按钮逻辑):');
  try {
    const response = await fetch('http://localhost:8000/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${storage.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    frontendResult = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    };
    
    console.log('   API响应状态:', response.status, response.statusText);
    
    if (response.ok) {
      const userData = await response.json();
      console.log('   ✅ 前端检查: 认证成功');
      console.log('   用户数据:', userData.email);
    } else if (response.status === 401) {
      console.log('   ❌ 前端检查: Token过期 (401)');
    } else {
      console.log('   ⚠️ 前端检查: 其他错误');
    }
  } catch (error) {
    console.log('   💥 前端检查: 网络错误 -', error.message);
    frontendResult = { error: error.message };
  }
  
  // 3. 后端认证检查（background script逻辑）
  console.log('\n🔧 3. 后端认证检查 (background script逻辑):');
  try {
    const authResult = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, resolve);
    });
    
    backgroundResult = authResult;
    
    console.log('   认证状态:', authResult.isAuthenticated ? '✅ 已认证' : '❌ 未认证');
    console.log('   用户信息:', authResult.user?.email || 'N/A');
    console.log('   Token存在:', !!authResult.token);
    console.log('   失败原因:', authResult.reason || 'N/A');
    console.log('   错误信息:', authResult.error || 'N/A');
  } catch (error) {
    console.log('   💥 后端检查: 通信错误 -', error.message);
    backgroundResult = { error: error.message };
  }
  
  // 4. 再次检查存储状态（看是否被清除）
  console.log('\n📦 4. 检查存储状态 (认证检查后):');
  const storageAfter = await chrome.storage.local.get(['accessToken', 'user']);
  console.log('   Token存在:', !!storageAfter.accessToken);
  console.log('   用户存在:', !!storageAfter.user);
  
  // 5. 对比分析
  console.log('\n📊 5. 认证状态对比分析:');
  console.log('   前端检查结果:', frontendResult);
  console.log('   后端检查结果:', backgroundResult);
  
  // 检查是否存在不一致
  const isInconsistent = (
    (frontendResult?.ok && !backgroundResult?.isAuthenticated) ||
    (!frontendResult?.ok && backgroundResult?.isAuthenticated)
  );
  
  if (isInconsistent) {
    console.log('🚨 发现认证状态不一致!');
    console.log('   前端状态:', frontendResult?.ok ? '成功' : '失败');
    console.log('   后端状态:', backgroundResult?.isAuthenticated ? '成功' : '失败');
    
    // 提供解决方案
    if (frontendResult?.status === 401) {
      console.log('💡 解决方案: Token已过期，需要重新登录');
    } else if (!frontendResult?.ok && backgroundResult?.isAuthenticated) {
      console.log('💡 解决方案: 前端检查失败但后端通过，可能是网络问题');
    } else {
      console.log('💡 解决方案: 建议清除存储并重新登录');
    }
  } else {
    console.log('✅ 认证状态一致');
  }
  
  // 6. 测试保存流程
  console.log('\n💾 6. 测试保存流程:');
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'EXTRACT_CONTENT'}, (response) => {
        if (chrome.runtime.lastError) {
          console.log('   ❌ Content script未连接:', chrome.runtime.lastError.message);
          console.log('   💡 解决方案: 刷新页面 (F5)');
        } else if (response?.success) {
          console.log('   ✅ 页面数据提取成功');
          
          // 尝试保存
          chrome.tabs.sendMessage(tabs[0].id, {type: 'SAVE_PAGE'}, (saveResponse) => {
            if (chrome.runtime.lastError) {
              console.log('   ❌ 保存请求失败:', chrome.runtime.lastError.message);
            } else {
              console.log('   💾 保存结果:', saveResponse?.success ? '✅ 成功' : '❌ 失败');
              if (!saveResponse?.success) {
                console.log('   错误详情:', saveResponse?.error);
              }
            }
          });
        } else {
          console.log('   ❌ 页面数据提取失败:', response?.error);
        }
      });
    }
  });
}

// 运行诊断
diagnoseAuthInconsistency();
```

### 🔧 快速修复脚本

```javascript
// 🛠️ 认证状态同步修复
async function fixAuthInconsistency() {
  console.log('🔧 开始修复认证状态不一致...');
  
  // 1. 清除可能损坏的认证数据
  console.log('1. 清除本地认证数据...');
  await chrome.storage.local.remove(['accessToken', 'user']);
  
  // 2. 等待2秒
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 3. 检查是否仍有认证状态
  const storage = await chrome.storage.local.get(['accessToken', 'user']);
  if (storage.accessToken) {
    console.log('❌ 认证数据未完全清除，请手动重新登录');
  } else {
    console.log('✅ 认证数据已清除');
    console.log('💡 请在插件中重新登录');
  }
}

// 如需修复，运行：
// fixAuthInconsistency();
```

### 📋 手动验证步骤

1. **运行完整诊断**：
   ```javascript
   diagnoseAuthInconsistency();
   ```

2. **观察关键指标**：
   - 前端和后端的API调用结果是否一致
   - 认证检查前后存储状态是否改变
   - 保存流程是否能完整执行

3. **根据结果采取行动**：
   - 如果两个检查都返回401：需要重新登录
   - 如果前端成功但后端失败：可能是background script问题
   - 如果认证状态不一致：运行修复脚本

### 🎯 期望的一致性状态

- ✅ 前端和后端检查返回相同结果
- ✅ 401错误时两边都清除token
- ✅ 保存流程能够完整执行
- ✅ 错误信息准确反映实际状态 