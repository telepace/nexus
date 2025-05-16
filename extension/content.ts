import type { PlasmoCSConfig } from "plasmo"

// 指定内容脚本配置
export const config: PlasmoCSConfig = {
  // 只匹配 http 和 https URL
  matches: ["http://*/*", "https://*/*"],
  all_frames: false,
  run_at: "document_idle"
}

// 导出默认函数
export default function() {
  // 这里可以放置内容脚本的代码
  console.debug("Nexus extension content script loaded")
} 