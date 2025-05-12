import React, { useState } from 'react'
import Button from './Button'
import { useAuth } from '../utils/authContext'

interface LoginFormProps {
  onSwitchToRegister?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, error, loading, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setFormError(null)

    // 表单验证
    if (!email) {
      setFormError('请输入邮箱')
      return
    }
    if (!password) {
      setFormError('请输入密码')
      return
    }

    try {
      await login({ username: email, password })
    } catch (error) {
      // 错误已经在 auth context 中处理
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>登录 Nexus</h2>
      
      <form onSubmit={handleSubmit}>
        {/* 显示表单错误 */}
        {(formError || error) && (
          <div style={{ 
            backgroundColor: '#ffebee', 
            color: '#c62828', 
            padding: '0.5rem', 
            borderRadius: '4px', 
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            {formError || error}
          </div>
        )}

        {/* 邮箱输入 */}
        <div style={{ marginBottom: '0.75rem' }}>
          <label 
            htmlFor="email" 
            style={{ 
              display: 'block', 
              marginBottom: '0.25rem',
              fontSize: '0.875rem' 
            }}
          >
            邮箱
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* 密码输入 */}
        <div style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="password" 
            style={{ 
              display: 'block', 
              marginBottom: '0.25rem',
              fontSize: '0.875rem' 
            }}
          >
            密码
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* 登录按钮 */}
        <Button 
          primary 
          disabled={loading}
          style={{ width: '100%', marginBottom: '0.75rem' }}
        >
          {loading ? '登录中...' : '登录'}
        </Button>
      </form>

      {/* 切换到注册 */}
      {onSwitchToRegister && (
        <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
          还没有账号？
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: '#0070f3',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0',
              textDecoration: 'underline',
              marginLeft: '0.25rem'
            }}
          >
            注册
          </button>
        </div>
      )}
    </div>
  )
}

export default LoginForm 