import React from "react"

interface ClipButtonProps {
  isSaving: boolean
  saveSuccess: boolean
  title: string
  onClip: () => void
  onSummarize: () => void
  disabled?: boolean
}

const ClipButton: React.FC<ClipButtonProps> = ({
  isSaving,
  saveSuccess,
  title,
  onClip,
  onSummarize,
  disabled = false
}) => {
  const truncatedTitle = title.length > 30 ? `${title.substring(0, 30)}...` : title

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">当前页面</h3>
      <p className="text-sm mb-2 text-gray-900 font-medium">{truncatedTitle}</p>
      
      <div className="flex space-x-2">
        <button
          onClick={onClip}
          disabled={isSaving || saveSuccess || disabled}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
            disabled 
              ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
              : saveSuccess
                ? "bg-green-500 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isSaving ? "保存中..." : saveSuccess ? "已保存" : "保存到 Nexus"}
        </button>
        
        <button
          onClick={onSummarize}
          disabled={disabled}
          className={`py-2 px-3 rounded-md text-sm font-medium ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
          }`}
          title="总结此页面"
        >
          总结
        </button>
      </div>
    </div>
  )
}

export default ClipButton 