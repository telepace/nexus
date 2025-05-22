"use client";

import { FC, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("account");

  if (!open) {
    return <div className="hidden" />;
  }

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
                value="account"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                账户信息
              </TabsTrigger>
              <TabsTrigger
                value="preferences"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                偏好设置
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
              >
                关于 Nexus
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="h-[calc(80vh-8rem)] overflow-y-auto p-6">
            <TabsContent value="account" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">账户信息</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">管理您的账户详情和设置</p>
                </div>
                <Separator />
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">姓名</Label>
                    <div className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm">
                      用户名
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">邮箱</Label>
                    <div className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-sm">
                      user@example.com
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">账户安全</h4>
                  <Button variant="outline">更改密码</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">偏好设置</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">自定义您的应用体验</p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">通用</h4>

                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="theme">主题</Label>
                      <RadioGroup defaultValue="system" className="flex gap-4">
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
                      <Select defaultValue="zh-CN">
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="选择语言" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh-CN">简体中文</SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Feed 流</h4>
                  
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
                    <Label htmlFor="sort">默认排序方式</Label>
                    <Select defaultValue="recent">
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="选择排序方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">最近添加</SelectItem>
                        <SelectItem value="title">标题</SelectItem>
                        <SelectItem value="type">内容类型</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">阅读界面</h4>
                  
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
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="ai-collapse" />
                    <Label htmlFor="ai-collapse">AI Message 默认折叠</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="about" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">关于 Nexus</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">应用信息与帮助资源</p>
                </div>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">版本</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">1.0.0</span>
                  </div>
                  
                  <div className="grid gap-4">
                    <Button variant="outline" className="justify-start">
                      <a href="#" className="flex w-full">隐私协议</a>
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <a href="#" className="flex w-full">用户协议</a>
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <a href="#" className="flex w-full">用户手册/FAQ</a>
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">联系支持</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    如果您有任何问题或需要帮助，请发送邮件至 
                    <a href="mailto:support@nexus.com" className="text-primary hover:underline">
                      support@nexus.com
                    </a>
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}; 