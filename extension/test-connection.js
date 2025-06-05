// 扩展连接测试脚本
console.log('🔧 Starting Nexus Extension Connection Test...');

// 模拟各种连接场景
const testScenarios = [
  {
    name: 'Basic Connection Test',
    test: () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: true, response });
          }
        });
      });
    }
  },
  {
    name: 'Content Extraction Test',
    test: () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve({ success: true, response });
          }
        });
      });
    }
  },
  {
    name: 'Multiple Rapid Requests Test',
    test: async () => {
      const results = [];
      for (let i = 0; i < 5; i++) {
        try {
          const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'PING', requestId: i }, (response) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }
      return { success: true, results };
    }
  }
];

// 运行测试
async function runTests() {
  console.log('📋 Running connection tests...\n');
  
  for (const scenario of testScenarios) {
    console.log(`🧪 Testing: ${scenario.name}`);
    try {
      const result = await scenario.test();
      if (result.success) {
        console.log('   ✅ PASSED');
        if (result.response) {
          console.log('   📄 Response:', JSON.stringify(result.response, null, 2));
        }
        if (result.results) {
          console.log('   📄 Results:', result.results);
        }
      } else {
        console.log('   ❌ FAILED:', result.error);
      }
    } catch (error) {
      console.log('   ❌ ERROR:', error.message);
    }
    console.log('');
  }
  
  console.log('🏁 Connection tests completed');
}

// 如果在内容脚本环境中运行
if (typeof chrome !== 'undefined' && chrome.runtime) {
  runTests();
} else {
  console.log('❌ Chrome runtime not available. This script should be run in a Chrome extension context.');
} 