import React from "react"
import { render } from "react-dom"
import "./styles/tailwind.css"

const Sidebar = () => {
  return (
    <div className="w-full h-screen bg-background text-foreground p-4">
      <h1 className="text-xl font-bold mb-4">Nexus 边栏</h1>
      <div className="border-t pt-4">
        <div id="nexus-sidebar-content" className="prose">
          {/* 内容将由内容脚本动态填充 */}
          <div className="text-center text-muted-foreground py-8">
            正在加载内容...
          </div>
        </div>
      </div>
    </div>
  )
}

// 创建容器并渲染
const container = document.createElement("div")
document.body.appendChild(container)
render(<Sidebar />, container)

export default Sidebar 