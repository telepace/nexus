import React from "react";
import { User, LogIn, LogOut } from "lucide-react";
import { Button } from "./ui/Button";
import { openLoginPage } from "../lib/auth";
import type { User as UserType } from "../lib/types";

interface AuthSectionProps {
  isAuthenticated: boolean;
  user: UserType | null;
  onLogout: () => void;
  onSyncAuth: () => void;
}

export function AuthSection({ isAuthenticated, user, onLogout, onSyncAuth }: AuthSectionProps) {
  if (isAuthenticated && user) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-3 w-3 mr-1" />
            退出
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <LogIn className="h-4 w-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-800">未登录</span>
      </div>
      
      <div className="flex gap-2">
        <Button size="sm" onClick={openLoginPage}>
          登录
        </Button>
        <Button variant="outline" size="sm" onClick={onSyncAuth}>
          同步登录状态
        </Button>
      </div>
      
      <p className="text-xs text-yellow-700">
        请先在网页端登录，然后点击"同步登录状态"
      </p>
    </div>
  );
} 