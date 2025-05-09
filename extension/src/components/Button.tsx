import React from "react"

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  primary?: boolean
  disabled?: boolean
  style?: React.CSSProperties
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  primary = false,
  disabled = false,
  style = {}
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        backgroundColor: primary ? "#0070f3" : "#f1f1f1",
        color: primary ? "white" : "black",
        border: "none",
        borderRadius: "4px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...style
      }}>
      {children}
    </button>
  )
}

export default Button 