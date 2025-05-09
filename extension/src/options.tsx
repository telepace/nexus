import { useEffect, useState } from "react"
import { Storage } from "./utils/storage"

// 设置类型定义
interface Settings {
  apiKey: string
  theme: "light" | "dark" | "system"
  notifications: boolean
}

function OptionsPage() {
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    theme: "light",
    notifications: true
  })

  useEffect(() => {
    // 加载设置
    const loadSettings = async () => {
      const storedSettings = await Storage.get<Settings>("settings")
      if (storedSettings) {
        setSettings(storedSettings)
      }
    }

    loadSettings()
  }, [])

  const saveSettings = async () => {
    await Storage.set("settings", settings)
    alert("设置已保存")
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
      <h1>Nexus Extension 设置</h1>
      
      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="apiKey" style={{ display: "block", marginBottom: "8px" }}>
          API Key
        </label>
        <input
          id="apiKey"
          type="text"
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>
      
      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="theme" style={{ display: "block", marginBottom: "8px" }}>
          主题
        </label>
        <select
          id="theme"
          value={settings.theme}
          onChange={(e) => setSettings({ 
            ...settings, 
            theme: e.target.value as Settings["theme"]
          })}
          style={{ width: "100%", padding: "8px" }}>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>
      
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "flex", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
            style={{ marginRight: "8px" }}
          />
          启用通知
        </label>
      </div>
      
      <button
        onClick={saveSettings}
        style={{
          padding: "8px 16px",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}>
        保存设置
      </button>
    </div>
  )
}

export default OptionsPage 