import { useState } from "react"
import { AuthProvider } from "./utils/authContext"
import Auth from "./components/Auth"

/**
 * A functional component that renders a simple popup with a count button.
 */
function IndexPopup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 320
      }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Nexus 插件</h1>
      
      <AuthProvider>
        <Auth />
      </AuthProvider>
    </div>
  )
}

export default IndexPopup 