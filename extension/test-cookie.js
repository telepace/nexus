// 测试脚本：验证前端cookie设置
// 在浏览器控制台运行此脚本

console.log('=== Nexus Cookie 测试 ===');

// 1. 检查当前页面的所有cookies
console.log('1. 当前页面所有cookies:');
console.log(document.cookie);

// 2. 检查特定的accessToken cookie
function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

const accessToken = getCookie('accessToken');
const accessTokenExt = getCookie('accessToken_ext');

console.log('2. 检查accessToken cookie:');
console.log('accessToken:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NOT FOUND');
console.log('accessToken_ext:', accessTokenExt ? `${accessTokenExt.substring(0, 20)}...` : 'NOT FOUND');

// 3. 测试API调用
if (accessToken) {
  console.log('3. 测试API调用:');
  fetch('http://localhost:8000/api/v1/users/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  .then(response => {
    console.log('API响应状态:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('用户数据:', data);
  })
  .catch(error => {
    console.error('API调用失败:', error);
  });
} else {
  console.log('3. 无法测试API - 未找到accessToken');
}

// 4. 手动设置测试cookie（如果需要）
window.setTestToken = function(token) {
  const cookieValue = `accessToken=${token};path=/;max-age=${60 * 60 * 24 * 7}`;
  document.cookie = cookieValue;
  
  const extCookieValue = `accessToken_ext=${token};path=/;max-age=${60 * 60 * 24 * 7};SameSite=Lax`;
  document.cookie = extCookieValue;
  
  console.log('测试token已设置');
  console.log('新的cookies:', document.cookie);
};

console.log('=== 测试完成 ===');
console.log('如需手动设置token，请运行: setTestToken("your_token_here")'); 