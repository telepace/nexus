import React from "react"
import { Button } from "~/components/ui/button"

interface ClipButtonProps {
  isSaving: boolean
  saveSuccess: boolean
  title: string
  onClip: () => void
  onSummarize: () => void
}

const ClipButton: React.FC<ClipButtonProps> = ({
  isSaving,
  saveSuccess,
  title,
  onClip,
  onSummarize
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold mb-2">当前页面</h2>
      <div className="mb-4 truncate text-sm text-muted-foreground">
        {title || "加载中..."}
      </div>
      
      <Button
        className="w-full h-12 text-base mb-1"
        disabled={isSaving}
        onClick={onClip}
      >
        {isSaving ? "保存中..." : saveSuccess ? "✓ 已保存" : "一键剪藏到 Nexus"}
      </Button>
      
      {saveSuccess && (
        <div className="text-xs text-center text-muted-foreground">
          已存入待看列表。需要 AI 处理？
          <button 
            className="ml-1 text-primary hover:underline" 
            onClick={onSummarize}
          >
            打开侧边栏总结
          </button>
        </div>
      )}
    </div>
  )
}

export default ClipButton 