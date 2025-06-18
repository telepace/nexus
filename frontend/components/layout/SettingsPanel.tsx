"use client";

import { FC, useState, useRef, ChangeEvent, useEffect } from "react";
import {
  X,
  User,
  Lock,
  Eye,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { TimeZoneSelector } from "@/components/ui/TimeZoneSelector";
import { useTimeZone } from "../../lib/time-zone-context";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth";
import { getCookie } from "cookies-next";

// 添加时区设置组件
const TimeZoneSettings = () => {
  const { timeZone, setTimeZone, isAutoTimeZone, setIsAutoTimeZone } =
    useTimeZone();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-timezone" className="text-sm font-normal">
          使用浏览器时区
        </Label>
        <Switch
          id="auto-timezone"
          checked={isAutoTimeZone}
          onCheckedChange={setIsAutoTimeZone}
        />
      </div>

      {!isAutoTimeZone && (
        <div className="grid gap-2">
          <Label htmlFor="timezone" className="text-sm font-normal">
            选择时区
          </Label>
          <TimeZoneSelector value={timeZone} onChange={setTimeZone} label="" />
        </div>
      )}
    </div>
  );
};

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState("/images/vinta.png");
  const [isUploading, setIsUploading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    updates: true,
  });
  const { user, updateUser } = useAuth();

  // 表单字段状态
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 当 user 变化时填充表单
  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || "",
        email: user.email || "",
      });
      if (user.avatar_url) {
        setAvatarSrc(user.avatar_url);
      }
    }
  }, [user]);

  /**
   * Normalize image source so that it is always a valid URL for Next.js <Image> component.
   * - If src already starts with "http://", "https://" or "/", return as-is.
   * - Otherwise, prefix with a leading slash so that it is treated as an absolute
   *   path from the web root (e.g. when we receive something like
   *   "mock_r2_url/mock-bucket/avatars/..." from the backend mock storage layer).
   */
  const normalizeSrc = (src: string | undefined | null) => {
    if (!src) return "/images/vinta.png";
    if (
      src.startsWith("http://") ||
      src.startsWith("https://") ||
      src.startsWith("/")
    ) {
      return src;
    }
    return `/${src}`;
  };

  if (!open) {
    return <div className="hidden" />;
  }

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.match("image.*")) {
      toast({
        title: "文件类型错误",
        description: "请选择图片文件",
        variant: "destructive",
      });
      return;
    }

    // 验证文件大小（限制为 2MB）
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "文件过大",
        description: "头像图片不能超过 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // 创建一个本地预览
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      setAvatarSrc(base64Image);

      // 上传到服务器
      const uploadAvatar = async () => {
        try {
          // 获取认证token
          const token = getCookie("accessToken");
          if (!token) {
            throw new Error("未找到认证token，请重新登录");
          }

          // 创建FormData对象
          const formData = new FormData();
          formData.append("avatar", file);

          // 发送请求到服务器
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          const response = await fetch(`${apiUrl}/api/v1/users/me/avatar`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
            credentials: "include",
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`上传失败: ${response.status} ${errorText}`);
          }

          const updatedUser = await response.json();

          // 更新用户信息，只更新头像相关字段
          await updateUser({ avatar_url: updatedUser.avatar_url });

          toast({
            title: "头像已更新",
            description: "您的头像已成功更换并保存到服务器",
          });
        } catch (error) {
          console.error("上传头像失败:", error);
          toast({
            title: "上传失败",
            description:
              error instanceof Error
                ? error.message
                : "头像无法保存到服务器，请稍后重试",
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
      };

      uploadAvatar();
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast({
        title: "上传失败",
        description: "头像更新失败，请重试",
        variant: "destructive",
      });
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative h-[80vh] w-[90vw] max-w-3xl rounded-lg bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            设置
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="关闭"
          >
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
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    个人资料
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    管理您的个人信息
                  </p>
                </div>
                <Separator />
                <div className="grid gap-6">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="h-24 w-24 relative rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                      <Image
                        src={normalizeSrc(avatarSrc) || "/images/vinta.png"}
                        alt="Profile"
                        className="object-contain w-full h-full"
                        width={96}
                        height={96}
                        onError={() => setAvatarSrc("/images/vinta.png")}
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAvatarClick}
                          disabled={isUploading}
                        >
                          {isUploading ? "上传中..." : "更换"}
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">姓名</Label>
                        <Input
                          id="name"
                          value={profileForm.full_name}
                          onChange={(e) =>
                            setProfileForm((p) => ({
                              ...p,
                              full_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={async () => {
                        if (isSavingProfile) return;
                        setIsSavingProfile(true);
                        try {
                          await updateUser({
                            full_name: profileForm.full_name,
                            email: profileForm.email,
                          });
                          toast({
                            title: "已保存",
                            description: "个人资料已更新",
                          });
                        } catch (err) {
                          console.error("Profile update failed:", err);
                          toast({
                            title: "保存失败",
                            description: "无法更新资料，请稍后重试",
                            variant: "destructive",
                          });
                        } finally {
                          setIsSavingProfile(false);
                        }
                      }}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      保存
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="password" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    密码安全
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    更新您的密码和安全设置
                  </p>
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
                    <Button className="bg-primary hover:bg-primary/90">
                      更新密码
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    双重认证
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">双重认证</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        增强账户安全性
                      </p>
                    </div>
                    <Button variant="outline">设置</Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    外观
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    自定义界面外观和显示设置
                  </p>
                </div>
                <Separator />
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      主题
                    </h4>
                    <div className="flex items-center space-x-4">
                      {(
                        [
                          { value: "light", label: "浅色" },
                          { value: "dark", label: "深色" },
                          { value: "system", label: "自动" },
                        ] as const
                      ).map((opt) => (
                        <Button
                          key={opt.value}
                          variant={theme === opt.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTheme(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      时区设置
                    </h4>
                    <TimeZoneSettings />
                  </div>

                  <div className="grid gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      字体大小
                    </h4>
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="font-size"
                        className="text-sm font-normal"
                      >
                        界面字体大小
                      </Label>
                      <select
                        id="font-size"
                        className="w-40 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1 text-sm"
                      >
                        <option value="small">小</option>
                        <option value="medium">中</option>
                        <option value="large">大</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    通知设置
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    管理您接收通知的方式
                  </p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">电子邮件通知</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        接收重要更新和通知
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={notifications.email}
                      onCheckedChange={() => handleNotificationChange("email")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">推送通知</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        在您的设备上接收通知
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={notifications.push}
                      onCheckedChange={() => handleNotificationChange("push")}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="product-updates">产品更新</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        接收关于新功能和改进的信息
                      </p>
                    </div>
                    <Switch
                      id="product-updates"
                      checked={notifications.updates}
                      onCheckedChange={() =>
                        handleNotificationChange("updates")
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    隐私与安全
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    管理您的隐私和数据设置
                  </p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      数据收集
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-medium">使用数据分析</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          帮助我们改进产品
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      隐私控制
                    </h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span>隐私设置</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span>查看我的数据</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between text-red-500 dark:text-red-400 hover:text-red-500/90 dark:hover:text-red-400/90"
                      >
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
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        安全日志
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        查看账户活动和安全事件
                      </p>
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
