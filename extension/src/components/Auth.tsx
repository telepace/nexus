import React, { useState } from 'react'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import UserProfile from './UserProfile'
import { useAuth } from '../utils/authContext'

enum AuthMode {
  LOGIN = 'login',
  REGISTER = 'register'
}

const Auth: React.FC = () => {
  const { isAuthenticated, loading } = useAuth()
  const [mode, setMode] = useState<AuthMode>(AuthMode.LOGIN)

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>加载中...</div>
      </div>
    )
  }

  // 如果用户已登录，显示用户信息
  if (isAuthenticated) {
    return <UserProfile />
  }

  // 否则，显示登录或注册表单
  return (
    <div>
      {mode === AuthMode.LOGIN ? (
        <LoginForm onSwitchToRegister={() => setMode(AuthMode.REGISTER)} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode(AuthMode.LOGIN)} />
      )}
    </div>
  )
}

export default Auth 