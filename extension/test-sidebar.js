// 这个脚本用于测试侧边栏的集成和自动修复问题

// 等待Nexus测试对象可用
function waitForNexusTest(maxAttempts = 10, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      console.log(`尝试检查Nexus测试对象 (${attempts + 1}/${maxAttempts})...`);
      
      if (window.__nexusTest) {
        console.log("找到 __nexusTest 对象!");
        resolve(window.__nexusTest);
        return;
      }
      
      if (window.__nexusSidebar) {
        console.log("找到 __nexusSidebar 对象!");
        resolve(window.__nexusSidebar);
        return;
      }
      
      attempts++;
      
      if (attempts >= maxAttempts) {
        reject(new Error("无法找到Nexus测试对象"));
        return;
      }
      
      setTimeout(check, interval);
    };
    
    check();
  });
}

// 诊断环境状态
async function diagnoseEnvironment() {
  console.log("%c开始环境诊断...", "color: purple; font-weight: bold");
  const results = {
    nexusObjects: {
      nexusSidebar: !!window.__nexusSidebar,
      nexusTest: !!window.__nexusTest,
      score: 0
    },
    domElements: {
      sidebarElement: !!document.getElementById("nexus-sidebar"),
      sidebarRoot: !!document.getElementById("nexus-sidebar-root"),
      sidebarStyles: !!document.getElementById("nexus-sidebar-styles"),
      score: 0
    },
    messaging: {
      postMessageWorks: false,
      chromeRuntimeWorks: false,
      score: 0
    },
    globalState: {
      hasDOMContentLoaded: document.readyState !== 'loading',
      hasBodyElement: !!document.body,
      score: 0
    }
  };
  
  // 计算分数
  results.nexusObjects.score = (results.nexusObjects.nexusSidebar ? 50 : 0) + (results.nexusObjects.nexusTest ? 50 : 0);
  results.domElements.score = (results.domElements.sidebarElement ? 40 : 0) + 
                            (results.domElements.sidebarRoot ? 30 : 0) + 
                            (results.domElements.sidebarStyles ? 30 : 0);
  results.globalState.score = (results.globalState.hasDOMContentLoaded ? 50 : 0) + 
                            (results.globalState.hasBodyElement ? 50 : 0);
  
  // 测试消息机制
  try {
    // 测试postMessage
    let postMessageReceived = false;
    const messageHandler = (event) => {
      if (event.data && event.data.source === "nexus-extension-sidebar") {
        postMessageReceived = true;
      }
    };
    
    window.addEventListener("message", messageHandler);
    window.postMessage({
      source: "nexus-extension-content",
      action: "ping"
    }, "*");
    
    // 等待200ms看看是否收到回应
    await new Promise(resolve => setTimeout(resolve, 200));
    window.removeEventListener("message", messageHandler);
    
    results.messaging.postMessageWorks = postMessageReceived;
    
    // 测试chrome.runtime
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage({ action: "ping" });
        results.messaging.chromeRuntimeWorks = true;
      } catch (error) {
        console.warn("chrome.runtime.sendMessage测试失败:", error);
      }
    }
    
    results.messaging.score = (results.messaging.postMessageWorks ? 50 : 0) + 
                            (results.messaging.chromeRuntimeWorks ? 50 : 0);
  } catch (error) {
    console.error("测试消息机制失败:", error);
  }
  
  // 计算总体健康度
  const healthScore = (
    results.nexusObjects.score * 0.3 + 
    results.domElements.score * 0.3 + 
    results.messaging.score * 0.2 + 
    results.globalState.score * 0.2
  ).toFixed(1);
  
  results.healthScore = healthScore;
  results.status = healthScore > 75 ? "健康" : 
                  healthScore > 50 ? "轻微问题" : 
                  healthScore > 25 ? "严重问题" : "危险状态";
  
  console.log("%c环境诊断结果:", "color: blue; font-weight: bold", results);
  console.log(`%c总体健康度: ${healthScore}% - ${results.status}`, 
    `color: ${healthScore > 75 ? "green" : healthScore > 50 ? "orange" : "red"}; font-weight: bold`);
  
  return results;
}

// 自动修复尝试
async function autoRepair() {
  console.log("%c开始自动修复...", "color: purple; font-weight: bold");
  
  const diagnosis = await diagnoseEnvironment();
  let repairActions = [];
  let repairSuccessful = false;
  
  try {
    // 如果DOM元素缺失，注入样式和创建侧边栏
    if (!diagnosis.domElements.sidebarElement || !diagnosis.domElements.sidebarRoot) {
      console.log("%c尝试修复: 重新创建侧边栏元素", "color: blue");
      repairActions.push("重新创建侧边栏元素");
      
      // 注入样式
      if (!diagnosis.domElements.sidebarStyles) {
        const style = document.createElement("style");
        style.id = "nexus-sidebar-styles";
        style.textContent = `
          #nexus-sidebar {
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            z-index: 2147483647;
            transition: right 0.3s ease;
            box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
            background: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          
          #nexus-sidebar.visible {
            right: 0;
          }
          
          #nexus-sidebar-root {
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
        `;
        document.head.appendChild(style);
        console.log("%c样式已注入", "color: green");
      }
      
      // 创建侧边栏容器
      if (!diagnosis.domElements.sidebarElement) {
        const container = document.createElement("div");
        container.id = "nexus-sidebar";
        container.style.cssText = `
          position: fixed;
          top: 0;
          right: -400px;
          width: 400px;
          height: 100vh;
          z-index: 2147483647;
          background-color: white;
          box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
          transition: right 0.3s ease;
          padding: 20px;
          display: flex;
          flex-direction: column;
        `;
        
        // 添加内容
        container.innerHTML = `
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0; font-size: 18px;">Nexus 助手</h2>
            <button id="nexus-sidebar-close" style="background: none; border: none; cursor: pointer; font-size: 20px;">&times;</button>
          </div>
          <div id="nexus-sidebar-root" style="flex: 1; overflow-y: auto; padding: 10px 0;">
            <p>Nexus 侧边栏已修复。</p>
            <p>请尝试使用扩展功能。</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 10px;">
            <button id="nexus-sidebar-refresh" style="background: #4f46e5; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">刷新</button>
          </div>
        `;
        
        // 添加到页面
        document.body.appendChild(container);
        console.log("%c侧边栏已创建", "color: green");
        
        // 添加事件监听器
        document.getElementById("nexus-sidebar-close")?.addEventListener("click", () => {
          container.style.right = "-400px";
        });
        
        document.getElementById("nexus-sidebar-refresh")?.addEventListener("click", () => {
          location.reload();
        });
      }
    }
    
    // 如果缺少全局对象，创建基本的全局对象
    if (!diagnosis.nexusObjects.nexusSidebar && !diagnosis.nexusObjects.nexusTest) {
      console.log("%c尝试修复: 创建全局测试对象", "color: blue");
      repairActions.push("创建全局测试对象");
      
      window.__nexusTest = {
        testSidebarToggle: () => {
          const sidebar = document.getElementById("nexus-sidebar");
          if (sidebar) {
            const isVisible = sidebar.style.right === "0px";
            sidebar.style.right = isVisible ? "-400px" : "0px";
            console.log(`侧边栏已${isVisible ? '隐藏' : '显示'}`);
            return true;
          }
          return false;
        },
        testSummarize: () => {
          const sidebar = document.getElementById("nexus-sidebar");
          if (sidebar) {
            sidebar.style.right = "0px";
            const content = document.getElementById("nexus-sidebar-root");
            if (content) {
              content.innerHTML = `
                <h3 style="margin-top: 0;">页面总结</h3>
                <p>这是一个由修复脚本生成的测试总结。</p>
                <p>如果你看到这个内容，说明侧边栏功能部分恢复，但页面与扩展的集成仍需修复。</p>
                <p>请尝试刷新页面或重启浏览器。</p>
              `;
            }
            return true;
          }
          return false;
        },
        testExtractPoints: () => {
          const sidebar = document.getElementById("nexus-sidebar");
          if (sidebar) {
            sidebar.style.right = "0px";
            const content = document.getElementById("nexus-sidebar-root");
            if (content) {
              content.innerHTML = `
                <h3 style="margin-top: 0;">要点提取</h3>
                <ul>
                  <li>这是修复脚本生成的测试要点</li>
                  <li>侧边栏功能已部分恢复</li>
                  <li>完整功能需要扩展与页面完全集成</li>
                  <li>请尝试刷新页面或重启浏览器</li>
                </ul>
              `;
            }
            return true;
          }
          return false;
        },
        testAIChat: () => {
          const sidebar = document.getElementById("nexus-sidebar");
          if (sidebar) {
            sidebar.style.right = "0px";
            const content = document.getElementById("nexus-sidebar-root");
            if (content) {
              content.innerHTML = `
                <h3 style="margin-top: 0;">AI 对话</h3>
                <div style="background: #f5f5f5; padding: 10px; border-radius: 10px; margin-bottom: 10px;">
                  <p style="margin: 0;"><strong>用户:</strong> 请帮我总结这个页面</p>
                </div>
                <div style="background: #e6f7ff; padding: 10px; border-radius: 10px;">
                  <p style="margin: 0;"><strong>AI:</strong> 这是一个由修复脚本生成的测试对话。如果你看到这个内容，说明侧边栏功能部分恢复，但完整功能需要扩展与页面完全集成。请尝试刷新页面或重启浏览器。</p>
                </div>
              `;
            }
            return true;
          }
          return false;
        }
      };
      
      // 简化版的侧边栏对象
      window.__nexusSidebar = {
        toggle: (show) => {
          const sidebar = document.getElementById("nexus-sidebar");
          if (sidebar) {
            sidebar.style.right = show ? "0px" : "-400px";
            return true;
          }
          return false;
        },
        create: () => {
          // 使用上面的代码已经创建了侧边栏
          return true;
        },
        summarize: () => window.__nexusTest.testSummarize(),
        extractPoints: () => window.__nexusTest.testExtractPoints(),
        openAIChat: () => window.__nexusTest.testAIChat()
      };
      
      console.log("%c全局对象已创建", "color: green");
    }
    
    // 如果消息系统有问题，设置简单的消息处理机制
    if (!diagnosis.messaging.postMessageWorks) {
      console.log("%c尝试修复: 添加消息监听器", "color: blue");
      repairActions.push("添加消息监听器");
      
      window.addEventListener("message", (event) => {
        if (event.data && event.data.source === "nexus-extension-content") {
          console.log("收到消息:", event.data);
          const action = event.data.action;
          
          switch (action) {
            case "toggleSidebar":
              window.__nexusSidebar?.toggle(event.data.show);
              break;
            case "summarizePage":
              window.__nexusTest?.testSummarize();
              break;
            case "processPage":
              window.__nexusTest?.testExtractPoints();
              break;
            case "openAIChat":
              window.__nexusTest?.testAIChat();
              break;
            case "ping":
              window.postMessage({
                source: "nexus-extension-sidebar",
                action: "pong"
              }, "*");
              break;
          }
          
          // 回复确认消息
          window.postMessage({
            source: "nexus-extension-sidebar",
            action: `${action}_response`,
            success: true
          }, "*");
        }
      });
      
      console.log("%c消息监听器已添加", "color: green");
    }
    
    // 最后，测试修复是否有效
    const afterRepair = await diagnoseEnvironment();
    
    if (afterRepair.healthScore > diagnosis.healthScore) {
      repairSuccessful = true;
      console.log(`%c修复成功! 健康度从 ${diagnosis.healthScore}% 提升到 ${afterRepair.healthScore}%`, 
                 "color: green; font-weight: bold");
    } else {
      console.log(`%c修复可能不完全，健康度: ${afterRepair.healthScore}%`, 
                 "color: orange; font-weight: bold");
    }
    
    // 尝试显示侧边栏
    const sidebar = document.getElementById("nexus-sidebar");
    if (sidebar) {
      sidebar.style.right = "0px";
      console.log("%c侧边栏已显示", "color: green");
    }
    
    return {
      initialDiagnosis: diagnosis,
      afterRepair: afterRepair,
      repairActions: repairActions,
      repairSuccessful: repairSuccessful
    };
  } catch (error) {
    console.error("自动修复失败:", error);
    return {
      initialDiagnosis: diagnosis,
      error: error.toString(),
      repairActions: repairActions,
      repairSuccessful: false
    };
  }
}

// 测试侧边栏注入
async function testSidebarInjection() {
  console.log("%c测试侧边栏注入开始...", "color: blue; font-weight: bold");
  
  try {
    // 检查侧边栏元素是否存在
    const sidebar = document.getElementById("nexus-sidebar");
    if (sidebar) {
      console.log("%c侧边栏已存在", "color: green", sidebar);
    } else {
      console.log("%c侧边栏不存在，尝试创建...", "color: orange");
      
      // 尝试通过 __nexusTest 或 __nexusSidebar 创建
      try {
        const nexusObject = await waitForNexusTest();
        
        if (nexusObject.create) {
          console.log("调用 __nexusSidebar.create() 函数");
          nexusObject.create();
        } else if (nexusObject.testSidebarToggle) {
          console.log("调用 __nexusTest.testSidebarToggle() 函数");
          nexusObject.testSidebarToggle();
        } else {
          console.error("无法找到创建侧边栏的方法");
        }
      } catch (error) {
        console.error("获取Nexus测试对象失败:", error);
        
        // 手动触发消息
        console.log("尝试通过window.postMessage创建侧边栏");
        window.postMessage({
          source: "nexus-extension-content",
          action: "toggleSidebar",
          show: true
        }, "*");
        
        // 如果仍然失败，尝试自动修复
        setTimeout(async () => {
          if (!document.getElementById("nexus-sidebar")) {
            console.log("%c侧边栏创建失败，尝试自动修复", "color: red");
            await autoRepair();
          }
        }, 1000);
      }
      
      // 延迟检查侧边栏是否已创建
      setTimeout(() => {
        const sidebarAfter = document.getElementById("nexus-sidebar");
        console.log("%c侧边栏创建后检查:", sidebarAfter ? "color: green" : "color: red", sidebarAfter);
      }, 1000);
    }
  } catch (error) {
    console.error("侧边栏注入测试失败:", error);
  }
}

// 测试显示/隐藏侧边栏
async function testToggleSidebar() {
  console.log("%c测试侧边栏切换开始...", "color: blue; font-weight: bold");
  
  try {
    // 确保侧边栏存在
    const sidebar = document.getElementById("nexus-sidebar");
    if (!sidebar) {
      console.error("%c侧边栏不存在，无法测试切换", "color: red");
      return;
    }
    
    // 获取当前状态
    const currentRight = sidebar.style.right;
    console.log("%c当前侧边栏位置:", "color: purple", currentRight);
    
    try {
      // 尝试显示侧边栏
      console.log("%c尝试显示侧边栏...", "color: blue");
      
      const nexusObject = await waitForNexusTest();
      
      if (nexusObject.toggle) {
        console.log("调用 __nexusSidebar.toggle(true) 函数");
        nexusObject.toggle(true);
      } else if (nexusObject.testSidebarToggle) {
        console.log("调用 __nexusTest.testSidebarToggle() 函数");
        nexusObject.testSidebarToggle();
      } else {
        // 手动触发消息
        console.log("尝试通过window.postMessage显示侧边栏");
        window.postMessage({
          source: "nexus-extension-content",
          action: "toggleSidebar",
          show: true
        }, "*");
      }
      
      // 延迟检查侧边栏是否已显示
      setTimeout(() => {
        console.log("%c切换后侧边栏位置:", "color: blue", sidebar.style.right);
        
        // 延迟2秒后隐藏侧边栏
        setTimeout(() => {
          console.log("%c尝试隐藏侧边栏...", "color: orange");
          
          if (nexusObject.toggle) {
            nexusObject.toggle(false);
          } else if (nexusObject.testSidebarToggle) {
            // 手动触发消息来隐藏
            window.postMessage({
              source: "nexus-extension-content",
              action: "toggleSidebar",
              show: false
            }, "*");
          }
          
          // 再次检查侧边栏状态
          setTimeout(() => {
            console.log("%c切换后侧边栏位置:", "color: purple", sidebar.style.right);
          }, 500);
        }, 2000);
      }, 500);
    } catch (error) {
      console.error("获取Nexus测试对象失败:", error);
      
      // 手动尝试显示和隐藏
      sidebar.style.right = "0px";
      console.log("直接通过DOM操作显示侧边栏");
      
      setTimeout(() => {
        sidebar.style.right = "-400px";
        console.log("直接通过DOM操作隐藏侧边栏");
      }, 2000);
    }
  } catch (error) {
    console.error("侧边栏切换测试失败:", error);
  }
}

// 测试功能按钮
async function testFeatureButtons() {
  console.log("%c测试功能按钮开始...", "color: blue; font-weight: bold");
  
  try {
    const nexusObject = await waitForNexusTest();
    
    // 测试总结功能
    console.log("%c测试总结功能...", "color: blue");
    if (nexusObject.summarize) {
      nexusObject.summarize();
    } else if (nexusObject.testSummarize) {
      nexusObject.testSummarize();
    } else {
      window.postMessage({
        source: "nexus-extension-content",
        action: "summarizePage"
      }, "*");
    }
    
    // 延迟测试提取要点
    setTimeout(() => {
      console.log("%c测试提取要点功能...", "color: blue");
      if (nexusObject.extractPoints) {
        nexusObject.extractPoints();
      } else if (nexusObject.testExtractPoints) {
        nexusObject.testExtractPoints();
      } else {
        window.postMessage({
          source: "nexus-extension-content",
          action: "processPage",
          type: "highlights"
        }, "*");
      }
      
      // 延迟测试AI对话
      setTimeout(() => {
        console.log("%c测试AI对话功能...", "color: blue");
        if (nexusObject.openAIChat) {
          nexusObject.openAIChat();
        } else if (nexusObject.testAIChat) {
          nexusObject.testAIChat();
        } else {
          window.postMessage({
            source: "nexus-extension-content",
            action: "openAIChat"
          }, "*");
        }
      }, 2000);
    }, 2000);
  } catch (error) {
    console.error("功能按钮测试失败:", error);
    
    // 尝试自动修复
    await autoRepair();
    
    // 手动尝试调用功能
    console.log("尝试通过window.postMessage测试功能");
    window.postMessage({
      source: "nexus-extension-content",
      action: "summarizePage"
    }, "*");
    
    setTimeout(() => {
      window.postMessage({
        source: "nexus-extension-content",
        action: "processPage",
        type: "highlights"
      }, "*");
      
      setTimeout(() => {
        window.postMessage({
          source: "nexus-extension-content",
          action: "openAIChat"
        }, "*");
      }, 2000);
    }, 2000);
  }
}

// 检查扩展是否已正确初始化，否则尝试修复
async function checkAndRepairExtension() {
  console.log("%c检查扩展状态...", "color: blue; font-weight: bold");
  
  // 检查环境情况
  const diagnosis = await diagnoseEnvironment();
  
  // 如果健康度低于50，尝试修复
  if (diagnosis.healthScore < 50) {
    console.log("%c扩展状态不佳，尝试自动修复...", "color: red; font-weight: bold");
    const repairResults = await autoRepair();
    
    if (repairResults.repairSuccessful) {
      console.log("%c修复成功!", "color: green; font-weight: bold");
    } else {
      console.log("%c修复不完全，请刷新页面或重新安装扩展", "color: orange; font-weight: bold");
    }
  } else {
    console.log("%c扩展状态良好，无需修复", "color: green; font-weight: bold");
  }
}

// 运行所有测试
async function runAllTests() {
  console.log("%c开始测试侧边栏集成...", "color: blue; font-weight: bold; font-size: 14px");
  
  // 先检查并修复扩展
  await checkAndRepairExtension();
  
  // 测试注入
  await testSidebarInjection();
  
  // 延迟后测试切换
  setTimeout(() => {
    testToggleSidebar();
    
    // 延迟后测试功能按钮
    setTimeout(() => {
      testFeatureButtons();
    }, 5000);
  }, 3000);
}

// 在页面加载完成后执行测试
if (document.readyState === "complete") {
  runAllTests();
} else {
  window.addEventListener('load', runAllTests);
}

// 导出测试函数到全局作用域，以便在控制台手动调用
window.nexusTests = {
  runAllTests,
  testSidebarInjection,
  testToggleSidebar,
  testFeatureButtons,
  diagnoseEnvironment,
  autoRepair,
  checkAndRepairExtension
}; 