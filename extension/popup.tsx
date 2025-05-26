import React from "react"
import { MemoryRouter } from "react-router-dom"
import "./styles/tailwind.css"
import PopupApp from "~pages/popup"

function IndexPopup() {
  return (
    <MemoryRouter>
      <PopupApp />
    </MemoryRouter>
  )
}

export default IndexPopup
