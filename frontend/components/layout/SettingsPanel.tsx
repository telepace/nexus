"use client";

import { FC, useState } from "react";
import { X, User, Lock, Eye, Bell, Shield, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true
  });

  if (!open) {
    return <div className="hidden" />;
  }

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLanguageChange = (value: string) => {
    // TODO: implement language change logic, e.g., update i18n or localStorage
    console.log("Language changed to:", value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative h-[80vh] w-[90vw] max-w-3xl rounded-lg bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">设置</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <TabsList className="p-0 bg-transparent border-b-0">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <User className="h-4 w-4 mr-2" />
                个人资料
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <Lock className="h-4 w-4 mr-2" />
                密码安全
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <Eye className="h-4 w-4 mr-2" />
                外观
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <Bell className="h-4 w-4 mr-2" />
                通知
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                <Shield className="h-4 w-4 mr-2" />
                隐私
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="h-[calc(80vh-8rem)] overflow-y-auto p-6">
            <TabsContent value="profile" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">个人资料</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">管理您的个人信息</p>
                </div>
                <Separator />
                <div className="grid gap-6">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="h-24 w-24 relative rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      <img src="/images/vinta.png" alt="Profile" className="object-cover w-full h-full" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="sm">更换</Button>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">姓名</Label>
                        <Input id="name" defaultValue="用户名" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bio">简介</Label>
                        <Input id="bio" defaultValue="用户简介" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input id="email" type="email" defaultValue="user@example.com" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="company">公司/组织</Label>
                    <Input id="company" defaultValue="" placeholder="输入您的公司或组织名称" />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button className="bg-primary hover:bg-primary/90">保存更改</Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="password" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">密码安全</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">更新您的密码和安全设置</p>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">当前密码</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button className="bg-primary hover:bg-primary/90">更新密码</Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">双重认证</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">双重认证</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">增强账户安全性</p>
                    </div>
                    <Button variant="outline">设置</Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">外观</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">自定义界面外观</p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="theme">主题</Label>
                    <RadioGroup 
                      defaultValue={theme} 
                      className="flex gap-4"
                      onValueChange={handleThemeChange}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="light" id="theme-light" />
                        <Label htmlFor="theme-light">浅色</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dark" id="theme-dark" />
                        <Label htmlFor="theme-dark">深色</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="system" id="theme-system" />
                        <Label htmlFor="theme-system">跟随系统</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="language">语言选择</Label>
                    <Select defaultValue="zh-CN" onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-[200px]" />
                      <SelectContent>
                        <SelectItem value="zh-CN">中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">界面密度</h4>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="density">卡片信息密度</Label>
                    <RadioGroup defaultValue="standard" className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="compact" id="density-compact" />
                        <Label htmlFor="density-compact">紧凑</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="density-standard" />
                        <Label htmlFor="density-standard">标准</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="fontSize">默认字体大小</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择字体大小" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">小</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="large">大</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">通知设置</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">管理您接收通知的方式</p>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">电子邮件通知</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">接收重要更新和通知</p>
                    </div>
                    <Switch 
                      id="email-notifications" 
                      checked={notifications.email}
                      onCheckedChange={() => handleNotificationChange('email')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">推送通知</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">在您的设备上接收通知</p>
                    </div>
                    <Switch 
                      id="push-notifications" 
                      checked={notifications.push}
                      onCheckedChange={() => handleNotificationChange('push')}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="product-updates">产品更新</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">接收关于新功能和改进的信息</p>
                    </div>
                    <Switch 
                      id="product-updates" 
                      checked={notifications.updates}
                      onCheckedChange={() => handleNotificationChange('updates')}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">隐私与安全</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">管理您的隐私和数据设置</p>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">数据收集</h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-medium">使用数据分析</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">帮助我们改进产品</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">隐私控制</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-between">
                        <span>隐私设置</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between">
                        <span>查看我的数据</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="w-full justify-between text-red-500 dark:text-red-400 hover:text-red-500/90 dark:hover:text-red-400/90">
                        <span>删除我的账户</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">安全日志</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">查看账户活动和安全事件</p>
                    </div>
                    <Button variant="outline">查看日志</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}; 