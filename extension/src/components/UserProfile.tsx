import React from 'react'
import Button from './Button'
import { useAuth } from '../utils/authContext'

const UserProfile: React.FC = () => {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>个人信息</h2>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px', 
          padding: '1rem',
          marginBottom: '1rem' 
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>邮箱：</span>
            <span style={{ fontSize: '0.875rem' }}>{user.email}</span>
          </div>
          
          {user.full_name && (
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>姓名：</span>
              <span style={{ fontSize: '0.875rem' }}>{user.full_name}</span>
            </div>
          )}
          
          <div>
            <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>角色：</span>
            <span style={{ fontSize: '0.875rem' }}>
              {user.is_superuser ? '管理员' : '普通用户'}
            </span>
          </div>
        </div>
        
        <Button 
          onClick={logout}
          style={{ width: '100%' }}
        >
          退出登录
        </Button>
      </div>
    </div>
  )
}

export default UserProfile 