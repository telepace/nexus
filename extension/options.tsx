import React, { useState, useEffect } from "react";
import { Settings, Save, ExternalLink } from "lucide-react";
import { Button } from "./components/ui/Button";
import { getAPIConfig } from "./lib/auth";
import "./style.css";

export default function OptionsPage() {
  const [config, setConfig] = useState(() => getAPIConfig());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // 在实际项目中，这里可以保存用户自定义的 API 配置
    // 目前使用环境变量，所以这里只是演示
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openWebApp = () => {
    chrome.tabs.create({ url: config.frontendUrl });
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Nexus 插件设置</h1>
        </div>

        {/* API Configuration */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">API 配置</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 服务器地址
                </label>
                <input
                  type="url"
                  value={config.apiUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://api.nexus-app.com"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  当前由环境变量配置，如需修改请联系管理员
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  前端应用地址
                </label>
                <input
                  type="url"
                  value={config.frontendUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, frontendUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://app.nexus-app.com"
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  当前由环境变量配置，如需修改请联系管理员
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button onClick={handleSave} disabled={saved}>
              <Save className="h-4 w-4 mr-2" />
              {saved ? "已保存" : "保存设置"}
            </Button>
            
            <Button variant="outline" onClick={openWebApp}>
              <ExternalLink className="h-4 w-4 mr-2" />
              打开 Web 应用
            </Button>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">使用帮助</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 首次使用请先在 Web 应用中注册账号</li>
              <li>• 登录后可在插件中同步登录状态</li>
              <li>• 支持智能摘要、关键要点提取等 AI 功能</li>
              <li>• 可将页面内容保存到个人知识库</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 