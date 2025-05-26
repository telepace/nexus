/**
 * 扩展重载帮助脚本
 * 
 * 此脚本用于开发过程中重新加载Chrome扩展
 * 需要在Chrome扩展管理页面中，以开发者模式打开，然后执行此脚本
 */

(async () => {
  // 找到所有扩展
  const extensions = await chrome.management.getAll();
  
  // 查找我们的扩展
  const ourExtension = extensions.find(ext => 
    ext.name === "Nexus AI" && 
    ext.installType === "development"
  );
  
  if (!ourExtension) {
    console.error("找不到开发模式下的Nexus AI扩展");
    return;
  }
  
  // 禁用然后重新启用扩展
  try {
    console.log("正在重新加载扩展...");
    await chrome.management.setEnabled(ourExtension.id, false);
    
    // 短暂延迟确保完全禁用
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await chrome.management.setEnabled(ourExtension.id, true);
    console.log("扩展已重新加载，ID:", ourExtension.id);
  } catch (error) {
    console.error("重新加载扩展失败:", error);
  }
})(); 