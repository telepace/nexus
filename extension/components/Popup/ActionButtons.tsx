import React from "react"

interface ActionButtonsProps {
  onSummarize: () => void
  onExtractPoints: () => void
  onAskAI: () => void
  onDiagnose?: () => void
  disabled?: boolean
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSummarize,
  onExtractPoints,
  onAskAI,
  onDiagnose,
  disabled = false
}) => {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">AI工具</h3>
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onSummarize}
          disabled={disabled}
          className={`p-2 rounded-md text-xs font-medium flex flex-col items-center ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          <span className="text-lg mb-1">📝</span>
          <span>总结</span>
        </button>
        
        <button
          onClick={onExtractPoints}
          disabled={disabled}
          className={`p-2 rounded-md text-xs font-medium flex flex-col items-center ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
        >
          <span className="text-lg mb-1">🔍</span>
          <span>提取要点</span>
        </button>
        
        <button
          onClick={onAskAI}
          disabled={disabled}
          className={`p-2 rounded-md text-xs font-medium flex flex-col items-center ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          <span className="text-lg mb-1">💬</span>
          <span>对话</span>
        </button>
        
        {onDiagnose && (
          <button
            onClick={onDiagnose}
            className="p-2 rounded-md text-xs font-medium flex flex-col items-center bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
          >
            <span className="text-lg mb-1">🛠️</span>
            <span>诊断</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default ActionButtons 