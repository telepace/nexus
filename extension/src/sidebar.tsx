import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"]
}

const Sidebar = () => {
  return (
    <div
      style={{
        width: "300px",
        height: "100vh",
        position: "fixed",
        top: 0,
        right: 0,
        backgroundColor: "white",
        boxShadow: "-2px 0 5px rgba(0, 0, 0, 0.1)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        padding: "16px"
      }}>
      <h2>Nexus 助手</h2>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <p>这里是您的 Nexus 助手，可以帮助您快速访问常用功能。</p>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <a href="#" style={{ textDecoration: "none", color: "#0070f3" }}>
              快速笔记
            </a>
          </li>
          <li style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <a href="#" style={{ textDecoration: "none", color: "#0070f3" }}>
              保存页面
            </a>
          </li>
          <li style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <a href="#" style={{ textDecoration: "none", color: "#0070f3" }}>
              AI 助手
            </a>
          </li>
        </ul>
      </div>
      <div>
        <button
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}>
          打开 Nexus 应用
        </button>
      </div>
    </div>
  )
}

export default Sidebar 