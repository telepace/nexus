/**
 * 检测浏览器是否支持Chrome原生侧边栏API
 * @returns {boolean} 是否支持Side Panel API
 */
export function isSidePanelSupported(): boolean {
  return typeof chrome !== 'undefined' && 
         typeof chrome.sidePanel !== 'undefined';
}

/**
 * 打开侧边栏
 * @param {number} tabId 标签页ID
 * @returns {Promise<boolean>} 是否成功打开
 */
export async function openSidebar(tabId: number): Promise<boolean> {
  if (isSidePanelSupported()) {
    try {
      await chrome.sidePanel.open({ tabId });
      console.log("[Nexus] 原生侧边栏已打开");
      return true;
    } catch (error) {
      console.error("[Nexus] 打开原生侧边栏失败:", error);
      return false;
    }
  }
  return false;
}

/**
 * 设置侧边栏行为
 * @returns {Promise<boolean>} 设置是否成功
 */
export async function setupSidePanelBehavior(): Promise<boolean> {
  if (isSidePanelSupported()) {
    try {
      await chrome.sidePanel.setPanelBehavior({ 
        openPanelOnActionClick: true 
      });
      console.log("[Nexus] 侧边栏行为已设置");
      return true;
    } catch (error) {
      console.error("[Nexus] 设置侧边栏行为失败:", error);
      return false;
    }
  }
  return false;
} 