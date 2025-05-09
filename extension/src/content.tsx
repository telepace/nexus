import type { PlasmoCSConfig } from "plasmo"
import { useEffect } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: true
}

const ContentScript = () => {
  useEffect(() => {
    console.log("Nexus Extension 内容脚本已加载!")
  }, [])

  return null
}

export default ContentScript 