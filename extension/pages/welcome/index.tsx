import React, { useState } from "react"
import { render } from "react-dom"
import { login, register, redirectToOAuthLogin } from "../../utils/api"
import { API_CONFIG, LOG_PREFIX } from "../../utils/config"

const WelcomePage = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [success, setSuccess] = useState<string | null>(null)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await login(loginForm.email, loginForm.password, true)
      setSuccess('登录成功！正在跳转...')
      
      // 如果前端URL配置存在，跳转到仪表盘
      setTimeout(() => {
        if (API_CONFIG.FRONTEND_URL) {
          window.location.href = `${API_CONFIG.FRONTEND_URL}/dashboard`
        }
      }, 1500)
    } catch (err) {
      console.error(`${LOG_PREFIX} 登录失败:`, err)
      setError((err as Error).message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // 验证密码是否匹配
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('两次输入的密码不匹配')
      setLoading(false)
      return
    }
    
    try {
      await register(registerForm.name, registerForm.email, registerForm.password, true)
      setSuccess('注册成功！正在跳转...')
      
      // 如果前端URL配置存在，跳转到仪表盘
      setTimeout(() => {
        if (API_CONFIG.FRONTEND_URL) {
          window.location.href = `${API_CONFIG.FRONTEND_URL}/dashboard`
        }
      }, 1500)
    } catch (err) {
      console.error(`${LOG_PREFIX} 注册失败:`, err)
      setError((err as Error).message || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">欢迎使用 Nexus</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI智能阅读助手，帮助您理解、保存和互动网页内容
          </p>
        </div>
        
        {success ? (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded">
            <div className="flex justify-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        ) : (
          <>
            <div className="flex border-b border-gray-200">
              <button
                className={`py-2 px-4 font-medium text-sm flex-1 ${activeTab === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('login')}
              >
                登录
              </button>
              <button
                className={`py-2 px-4 font-medium text-sm flex-1 ${activeTab === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('register')}
              >
                注册
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {activeTab === 'login' ? (
              <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">
                    邮箱地址
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={loginForm.email}
                    onChange={e => setLoginForm({ ...loginForm, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
                    密码
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? '登录中...' : '登录'}
                  </button>
                </div>
                
                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="px-3 text-sm text-gray-500">或</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                
                <div className="space-y-2">
                  <button 
                    type="button"
                    onClick={() => redirectToOAuthLogin('google')}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    使用Google登录
                  </button>
                </div>
              </form>
            ) : (
              <form className="mt-8 space-y-6" onSubmit={handleRegisterSubmit}>
                <div>
                  <label htmlFor="register-name" className="block text-sm font-medium text-gray-700">
                    姓名
                  </label>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={registerForm.name}
                    onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-700">
                    邮箱地址
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={registerForm.email}
                    onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })}
                  />
                </div>
                
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700">
                    密码
                  </label>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={registerForm.password}
                    onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                </div>
                
                <div>
                  <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700">
                    确认密码
                  </label>
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? '注册中...' : '注册'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}

render(<WelcomePage />, document.getElementById("root")) 