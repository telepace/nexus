import React, { useState, useEffect } from 'react'

interface AutoAnalysisConfig {
  enabled: boolean
  autoSummary: boolean
  autoKeypoints: boolean
  minWordCount: number
  excludeDomains: string[]
}

interface AutoAnalysisSettingsProps {
  onConfigChange?: (config: AutoAnalysisConfig) => void
}

export function AutoAnalysisSettings({ onConfigChange }: AutoAnalysisSettingsProps) {
  const [config, setConfig] = useState<AutoAnalysisConfig>({
    enabled: true,
    autoSummary: true,
    autoKeypoints: true,
    minWordCount: 300,
    excludeDomains: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTO_CONFIG' })
      if (response?.success && response?.config) {
        setConfig(response.config)
      }
    } catch (error) {
      console.error('Failed to load auto config:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async (newConfig: Partial<AutoAnalysisConfig>) => {
    try {
      setSaving(true)
      const updatedConfig = { ...config, ...newConfig }
      
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_AUTO_CONFIG',
        config: newConfig
      })
      
      if (response?.success) {
        setConfig(updatedConfig)
        onConfigChange?.(updatedConfig)
      }
    } catch (error) {
      console.error('Failed to update auto config:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">加载设置中...</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">⚙️ 自动分析设置</h3>
        {saving && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {/* 主开关 */}
      <div className="flex items-center justify-between">
        <div>
          <label className="font-medium text-gray-700">启用自动分析</label>
          <p className="text-sm text-gray-500">页面加载后自动生成摘要和要点</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* 分析类型 */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">分析类型</h4>
            
            <div className="flex items-center">
              <input
                id="auto-summary"
                type="checkbox"
                checked={config.autoSummary}
                onChange={(e) => updateConfig({ autoSummary: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="auto-summary" className="ml-2 text-sm text-gray-700">
                自动生成摘要
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="auto-keypoints"
                type="checkbox"
                checked={config.autoKeypoints}
                onChange={(e) => updateConfig({ autoKeypoints: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="auto-keypoints" className="ml-2 text-sm text-gray-700">
                自动提取要点
              </label>
            </div>
          </div>

          {/* 最小字数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最小字数触发 ({config.minWordCount} 字)
            </label>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={config.minWordCount}
              onChange={(e) => updateConfig({ minWordCount: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>100</span>
              <span>1000</span>
            </div>
          </div>

          {/* 排除域名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              排除的网站
            </label>
            <div className="text-sm text-gray-600 space-y-1">
              {config.excludeDomains.map((domain, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                  <span>{domain}</span>
                  <button
                    onClick={() => {
                      const newDomains = config.excludeDomains.filter((_, i) => i !== index)
                      updateConfig({ excludeDomains: newDomains })
                    }}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    移除
                  </button>
                </div>
              ))}
              {config.excludeDomains.length === 0 && (
                <p className="text-gray-400 italic">暂无排除的网站</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* 重置按钮 */}
      <div className="pt-2 border-t">
        <button
          onClick={() => updateConfig({
            enabled: true,
            autoSummary: true,
            autoKeypoints: true,
            minWordCount: 300,
            excludeDomains: []
          })}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          重置为默认设置
        </button>
      </div>
    </div>
  )
} 