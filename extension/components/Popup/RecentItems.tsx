import React from "react"
import type { ClippedItem } from "~/utils/interfaces"
import { formatDate } from "~/utils/commons"

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
        <h3 className="text-sm font-medium text-gray-700">最近剪藏</h3>
        <div className="flex space-x-1">
          <button
            onClick={onViewAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            全部
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={onOpenSettings}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            设置
          </button>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-3 text-sm text-gray-500">
          暂无剪藏内容
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onViewItem(item)}
              className="p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
            >
              <div className="text-sm font-medium text-gray-900 truncate">
                {item.title}
              </div>
              <div className="text-xs text-gray-500 flex justify-between mt-1">
                <span>{formatDate(new Date(item.timestamp))}</span>
                <span className={`
                  ${item.status === 'unread' ? 'text-blue-600' : 
                    item.status === 'reading' ? 'text-amber-600' : 
                    'text-green-600'}
                `}>
                  {item.status === 'unread' ? '未读' : 
                   item.status === 'reading' ? '阅读中' : 
                   '已读完'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 text-center text-xs text-gray-500">
        Nexus - 您的AI阅读助手
      </div>
    </div>
  )
}

export default RecentItems 