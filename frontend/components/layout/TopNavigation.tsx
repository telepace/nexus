"use client";

import { FC, useState } from "react";
import { Search, PlusCircle, Settings, User, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/components/actions/logout-action";

interface TopNavigationProps {
  onSettingsClick: () => void;
  onAddContentClick: () => void;
}

export const TopNavigation: FC<TopNavigationProps> = ({
  onSettingsClick,
  onAddContentClick,
}) => {
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 实现搜索逻辑
    console.log("Searching for:", searchValue);
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center">
        <div className="flex items-center mr-8">
          <img 
            src="/images/vinta.png" 
            alt="Nexus Logo" 
            className="h-8 w-8 mr-2"
          />
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            Nexus
          </span>
        </div>
        
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
          <Input
            type="search"
            placeholder="搜索您的内容库..."
            className="w-64 lg:w-80 pl-9"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
        </form>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button 
          onClick={onAddContentClick}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          <span>添加内容</span>
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              data-testid="user-menu"
            >
              <Avatar 
                className="h-8 w-8" 
                data-testid="user-avatar"
              >
                <AvatarFallback className="bg-primary/10 text-primary">
                  U
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">用户名</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">user@example.com</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                className="w-full flex items-center cursor-pointer"
                onClick={onSettingsClick}
              >
                <User className="mr-2 h-4 w-4" />
                <span>账户设置</span>
              </button>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                className="w-full flex items-center cursor-pointer text-red-500 dark:text-red-400"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>退出登录</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}; 