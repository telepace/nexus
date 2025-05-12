import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'
import { AuthState, LoginRequest, RegisterRequest, User } from './types'

// 初始认证状态
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true,
  error: null
}

// 创建认证上下文
interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 认证提供者组件
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState)

  // 加载初始认证状态
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        // 检查是否有保存的令牌
        const token = api.getToken()
        
        if (!token) {
          setState({ ...initialState, loading: false })
          return
        }
        
        // 如果有令牌，验证并获取用户信息
        const user = await api.getCurrentUser()
        
        setState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null
        })
      } catch (error) {
        console.error('认证状态加载失败:', error)
        // 如果令牌无效或过期，清除令牌
        api.clearToken()
        setState({ 
          isAuthenticated: false,
          user: null, 
          token: null, 
          loading: false,
          error: error instanceof Error ? error.message : '认证失败' 
        })
      }
    }
    
    loadAuthState()
  }, [])

  // 登录方法
  const login = async (credentials: LoginRequest) => {
    setState({ ...state, loading: true, error: null })
    
    try {
      // 登录并获取令牌
      await api.login(credentials)
      
      // 获取用户信息
      const user = await api.getCurrentUser()
      
      setState({
        isAuthenticated: true,
        user,
        token: api.getToken(),
        loading: false,
        error: null
      })
    } catch (error) {
      setState({ 
        ...state, 
        loading: false, 
        error: error instanceof Error ? error.message : '登录失败' 
      })
      throw error
    }
  }

  // 注册方法
  const register = async (userData: RegisterRequest) => {
    setState({ ...state, loading: true, error: null })
    
    try {
      // 注册用户
      await api.register(userData)
      
      // 注册成功后自动登录
      await login({ username: userData.email, password: userData.password })
    } catch (error) {
      setState({ 
        ...state, 
        loading: false, 
        error: error instanceof Error ? error.message : '注册失败' 
      })
      throw error
    }
  }

  // 登出方法
  const logout = () => {
    api.logout()
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null
    })
  }

  // 清除错误
  const clearError = () => {
    setState({ ...state, error: null })
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// 自定义钩子，便于使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用')
  }
  return context
} 