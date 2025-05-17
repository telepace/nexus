import React from "react"
import { render } from "react-dom"
import "./styles/tailwind.css"
import { SidebarRoot } from "./components/Sidebar"

// 创建容器并渲染
const container = document.createElement("div")
document.body.appendChild(container)
render(<SidebarRoot />, container)

export default SidebarRoot 