import { useState } from "react"

function IndexPopup() {
  const [count, setCount] = useState(0)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 320
      }}>
      <h1>Nexus Extension</h1>
      <p>这是 Nexus 平台的浏览器插件</p>
      <button
        onClick={() => setCount(count + 1)}
        style={{ marginTop: 16 }}>
        计数: {count}
      </button>
    </div>
  )
}

export default IndexPopup 