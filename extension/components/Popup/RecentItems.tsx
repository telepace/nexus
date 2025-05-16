import React from "react"
import type { ClippedItem } from "~/utils/interfaces"

interface RecentItemsProps {
  items: ClippedItem[]
  onViewItem: (item: ClippedItem) => void
  onViewAll: () => void
  onOpenSettings: () => void
}

const RecentItems: React.FC<RecentItemsProps> = ({
  items,
  onViewItem,
  onViewAll,
  onOpenSettings
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">最近剪藏</h2>
        <button 
          className="text-xs text-primary hover:underline"
          onClick={onViewAll}
        >
          在应用中查看全部
        </button>
      </div>
      
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map(item => (
            <div 
              key={item.id}
              className="p-2 border rounded hover:bg-secondary cursor-pointer"
              onClick={() => onViewItem(item)}
            >
              <div className="truncate text-sm font-medium">{item.title}</div>
              <div className="truncate text-xs text-muted-foreground">{item.url}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-4">
          没有最近剪藏项
        </div>
      )}
      
      <div className="flex justify-between mt-4 pt-2 border-t">
        <button
          className="text-xs text-primary hover:underline"
          onClick={onViewAll}
        >
          打开 Nexus
        </button>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={onOpenSettings}
        >
          设置
        </button>
      </div>
    </div>
  )
}

export default RecentItems 