import React from "react"
import { Button } from "~/components/ui/button"

interface ActionButtonsProps {
  onSummarize: () => void
  onExtractPoints: () => void
  onAskAI: () => void
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSummarize,
  onExtractPoints,
  onAskAI
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold mb-2">AI 洞察当前页</h2>
      <div className="grid grid-cols-3 gap-2">
        <Button 
          variant="outline" 
          className="text-xs py-1" 
          onClick={onSummarize}
        >
          总结此页
        </Button>
        <Button 
          variant="outline" 
          className="text-xs py-1" 
          onClick={onExtractPoints}
        >
          提取要点
        </Button>
        <Button 
          variant="outline" 
          className="text-xs py-1" 
          onClick={onAskAI}
        >
          提问 (AI)
        </Button>
      </div>
    </div>
  )
}

export default ActionButtons 