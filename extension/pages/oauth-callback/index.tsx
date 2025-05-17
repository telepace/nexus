import React, { useEffect, useState } from "react"
import { handleOAuthCallback } from "../../utils/api"
import { LOG_PREFIX } from "../../utils/config"

const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState<string>('正在处理登录请求...')

  useEffect(() => {
    async function processCallback() {
      try {
        // 获取URL参数
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const provider = params.get('provider') || 'google' // 默认为google
        const error = params.get('error')

        if (error) {
          setStatus('error')
          setMessage(`登录失败: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('登录失败: 未收到授权码')
          return
        }

        // 处理OAuth回调
        await handleOAuthCallback(code, provider)
        setStatus('success')
        setMessage('登录成功！请稍候...')

        // 关闭此标签页并打开弹出窗口
        setTimeout(() => {
          // 尝试打开扩展弹出窗口
          chrome.runtime.sendMessage({ action: "openPopup" })
          
          // 关闭当前标签页
          window.close()
        }, 1500)
      } catch (error) {
        console.error(`${LOG_PREFIX} OAuth回调处理错误:`, error)
        setStatus('error')
        setMessage(`登录失败: ${(error as Error).message || '未知错误'}`)
      }
    }

    processCallback()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {status === 'loading' && '正在处理'}
          {status === 'success' && '登录成功'}
          {status === 'error' && '登录失败'}
        </h1>
        
        <div className="flex justify-center mb-4">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          )}
          {status === 'success' && (
            <div className="text-green-500 text-4xl">✓</div>
          )}
          {status === 'error' && (
            <div className="text-red-500 text-4xl">✗</div>
          )}
        </div>
        
        <p className="text-center text-gray-700">{message}</p>
      </div>
    </div>
  )
}

export default OAuthCallback 