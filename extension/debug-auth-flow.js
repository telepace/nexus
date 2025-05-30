// 调试认证流程的脚本
// 在浏览器插件控制台中运行

console.log('=== 认证流程调试开始 ===');

// 1. 检查当前存储状态
chrome.storage.local.get(['accessToken', 'user'], (result) => {
  console.log('1. 当前存储状态:', result);
  
  // 2. 检查cookie状态
  chrome.cookies.getAll({url: 'http://localhost:3000'}, (cookies) => {
    console.log('2. 当前cookies:', cookies.filter(c => c.name.includes('Token')));
    
    // 3. 如果有cookie但没有存储，尝试同步
    const accessTokenCookie = cookies.find(c => c.name === 'accessToken');
    const accessTokenExtCookie = cookies.find(c => c.name === 'accessToken_ext');
    
    if ((accessTokenCookie || accessTokenExtCookie) && !result.accessToken) {
      console.log('3. 发现cookie但存储为空，尝试同步...');
      
      const tokenToUse = accessTokenExtCookie?.value || accessTokenCookie?.value;
      if (tokenToUse) {
        // 验证token
        fetch('http://localhost:8000/api/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        })
        .then(response => {
          console.log('Token验证响应:', response.status);
          return response.json();
        })
        .then(userData => {
          console.log('用户数据:', userData);
          
          // 保存到存储
          chrome.storage.local.set({
            accessToken: tokenToUse,
            user: userData
          }, () => {
            console.log('4. 已同步token和用户数据到存储');
            
            // 触发重新检查
            console.log('5. 刷新页面以更新UI...');
            window.location.reload();
          });
        })
        .catch(error => {
          console.error('Token验证失败:', error);
        });
      }
    } else if (result.accessToken) {
      console.log('3. 存储中已有token，验证是否有效...');
      
      fetch('http://localhost:8000/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${result.accessToken}`,
        },
      })
      .then(response => {
        console.log('存储token验证响应:', response.status);
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Token无效');
        }
      })
      .then(userData => {
        console.log('存储token有效，用户数据:', userData);
      })
      .catch(error => {
        console.error('存储token无效:', error);
        // 清除无效token
        chrome.storage.local.remove(['accessToken', 'user'], () => {
          console.log('已清除无效token');
        });
      });
    } else {
      console.log('3. 没有可用的认证信息');
    }
  });
});

// 手动清除认证信息的函数
window.clearAuth = function() {
  chrome.storage.local.clear(() => {
    console.log('已清除所有存储');
    // 也清除cookies
    chrome.cookies.remove({url: 'http://localhost:3000', name: 'accessToken'});
    chrome.cookies.remove({url: 'http://localhost:3000', name: 'accessToken_ext'});
    console.log('已清除cookies');
    window.location.reload();
  });
};

// 手动设置认证信息的函数
window.setAuth = function(token) {
  fetch('http://localhost:8000/api/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
  .then(response => response.json())
  .then(userData => {
    chrome.storage.local.set({
      accessToken: token,
      user: userData
    }, () => {
      console.log('已手动设置认证信息');
      window.location.reload();
    });
  })
  .catch(error => {
    console.error('Token无效:', error);
  });
};

console.log('=== 调试函数已准备 ===');
console.log('clearAuth() - 清除所有认证信息');
console.log('setAuth(token) - 手动设置认证信息'); 