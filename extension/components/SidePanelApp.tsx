import React from 'react';
import { useAuth } from '../lib/useAuth';
import { LoginForm } from './LoginForm';
import { DashboardView } from './DashboardView';

export default function SidePanelApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {user ? (
        <DashboardView user={user} />
      ) : (
        <div className="p-4">
          <LoginForm />
        </div>
      )}
    </div>
  );
} 