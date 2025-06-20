// 🔍 快速认证状态诊断脚本
// 复制这整个脚本到浏览器控制台运行

console.clear();
console.log('🔄 开始 Nexus 认证状态诊断...\n');

async function quickDiagnosis() {
  let step = 1;
  
  try {
    // Step 1: 检查存储状态
    console.log(`${step++}. 📦 检查本地存储:`);
    const storage = await chrome.storage.local.get(['accessToken', 'user']);
    console.log('   Token存在:', !!storage.accessToken);
    console.log('   Token长度:', storage.accessToken?.length || 0);
    console.log('   用户邮箱:', storage.user?.email || 'N/A');
    
    if (!storage.accessToken) {
      console.log('❌ 未找到token，请先登录扩展');
      return;
    }
    
    const token = storage.accessToken;
    const tokenPreview = token.substring(0, 20) + '...';
    console.log('   Token预览:', tokenPreview);
    
    // Step 2: 前端直接API测试
    console.log(`\n${step++}. 🖥️ 前端直接API测试:`);
    let frontendResult;
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      frontendResult = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      };
      
      console.log('   状态码:', response.status, response.statusText);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('   ✅ 前端测试: 成功');
        console.log('   用户:', userData.email);
      } else if (response.status === 401) {
        console.log('   ❌ 前端测试: Token过期 (401)');
        // 这里应该清除token，如果修复生效的话
        console.log('   🔄 清除token...');
        await chrome.storage.local.remove(['accessToken', 'user']);
        console.log('   ✅ Token已清除');
      } else {
        console.log('   ⚠️ 前端测试: 其他错误');
      }
    } catch (error) {
      console.log('   💥 前端测试失败:', error.message);
      frontendResult = { error: error.message };
    }
    
    // Step 3: Background script认证检查
    console.log(`\n${step++}. 🔧 Background script 认证检查:`);
    let backgroundResult;
    try {
      backgroundResult = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('   认证状态:', backgroundResult.isAuthenticated ? '✅ 已认证' : '❌ 未认证');
      console.log('   用户信息:', backgroundResult.user?.email || 'N/A');
      console.log('   Token存在:', !!backgroundResult.token);
      console.log('   失败原因:', backgroundResult.reason || 'N/A');
      
    } catch (error) {
      console.log('   💥 Background检查失败:', error.message);
      backgroundResult = { error: error.message };
    }
    
    // Step 4: 检查存储状态是否改变
    console.log(`\n${step++}. 📦 检查存储状态变化:`);
    const storageAfter = await chrome.storage.local.get(['accessToken', 'user']);
    console.log('   Token仍存在:', !!storageAfter.accessToken);
    console.log('   用户仍存在:', !!storageAfter.user);
    
    const tokenChanged = storage.accessToken !== storageAfter.accessToken;
    console.log('   Token是否改变:', tokenChanged ? '是' : '否');
    
    // Step 5: 分析不一致性
    console.log(`\n${step++}. 📊 一致性分析:`);
    const frontendSuccess = frontendResult?.ok === true;
    const backgroundSuccess = backgroundResult?.isAuthenticated === true;
    
    console.log('   前端结果:', frontendSuccess ? '✅ 成功' : '❌ 失败');
    console.log('   后端结果:', backgroundSuccess ? '✅ 成功' : '❌ 失败');
    
    if (frontendSuccess !== backgroundSuccess) {
      console.log('🚨 发现认证状态不一致!');
      
      if (frontendResult?.status === 401 && backgroundSuccess) {
        console.log('   问题: 前端检测到401但后端仍显示认证');
        console.log('   可能原因: 调试按钮的401处理未生效');
      } else if (frontendSuccess && !backgroundSuccess) {
        console.log('   问题: 前端成功但后端失败');
        console.log('   可能原因: Background script的认证逻辑有问题');
      }
      
      console.log('\n💡 建议解决方案:');
      console.log('   1. 重新加载扩展 (chrome://extensions/)');
      console.log('   2. 清除所有认证数据并重新登录');
      console.log('   3. 检查API服务器是否正常运行');
    } else {
      console.log('✅ 认证状态一致');
    }
    
    // Step 6: 测试保存流程
    console.log(`\n${step++}. 💾 测试保存流程:`);
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]?.id) {
        // 测试content script连接
        chrome.tabs.sendMessage(tabs[0].id, {type: 'PING'}, (pingResponse) => {
          if (chrome.runtime.lastError) {
            console.log('   ❌ Content script未连接');
            console.log('   解决方案: 刷新页面 (F5)');
          } else {
            console.log('   ✅ Content script已连接');
            
            // 测试页面数据提取
            chrome.tabs.sendMessage(tabs[0].id, {type: 'EXTRACT_CONTENT'}, (extractResponse) => {
              if (chrome.runtime.lastError) {
                console.log('   ❌ 页面数据提取失败');
              } else if (extractResponse?.success) {
                console.log('   ✅ 页面数据提取成功');
                
                // 测试保存请求
                chrome.tabs.sendMessage(tabs[0].id, {type: 'SAVE_PAGE'}, (saveResponse) => {
                  if (chrome.runtime.lastError) {
                    console.log('   ❌ 保存请求失败:', chrome.runtime.lastError.message);
                  } else {
                    console.log('   💾 保存结果:', saveResponse?.success ? '✅ 成功' : '❌ 失败');
                    if (!saveResponse?.success) {
                      console.log('   失败原因:', saveResponse?.error);
                    }
                  }
                  
                  // 完成诊断
                  console.log('\n🎯 诊断完成!');
                  console.log('请将以上完整日志发送给技术支持团队');
                });
              } else {
                console.log('   ❌ 页面数据提取失败:', extractResponse?.error);
              }
            });
          }
        });
      } else {
        console.log('   ❌ 无法获取当前标签页');
      }
    });
    
  } catch (error) {
    console.error('💥 诊断过程中出错:', error);
  }
}

// 运行诊断
quickDiagnosis(); 