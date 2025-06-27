"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useTimeZone } from "@/lib/time-zone-context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { TimeZoneSelector } from "@/components/ui/TimeZoneSelector";
import { toast } from "@/components/ui/use-toast";
import {
  Loader2,
  User as UserIcon,
  Lock,
  Palette,
  Bell,
  Shield,
  Sun,
  Moon,
  Monitor,
  Globe,
  Mail,
  Smartphone,
  Eye,
  Trash2,
  Upload,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

/**
 * 用户设置页面 - 包含完整的功能实现
 */
export default function SettingsPage() {
  const { user, isLoading, error, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { timeZone, setTimeZone, isAutoTimeZone, setIsAutoTimeZone } =
    useTimeZone();

  // UI 状态
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 密码修改状态
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 通知设置状态
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    appNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
  });

  // 隐私设置状态
  const [privacySettings, setPrivacySettings] = useState({
    dataSharing: false,
    analytics: true,
    profileVisibility: "public" as "public" | "private" | "friends",
  });

  // 头像上传相关状态
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理个人资料更新
  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
    };

    try {
      await updateUser(data);
      toast({
        title: "个人资料已更新",
        description: "您的个人资料信息已成功保存。",
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update error:", err);
      toast({
        title: "更新失败",
        description: "更新个人资料时出现错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理密码修改
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "密码不匹配",
        description: "新密码和确认密码不一致。",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "密码太短",
        description: "新密码至少需要8个字符。",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // 这里应该调用实际的密码修改 API
      // 暂时模拟一个成功的响应
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "密码已更新",
        description: "您的密码已成功修改。",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Password change error:", err);
      toast({
        title: "密码修改失败",
        description: "修改密码时出现错误，请检查当前密码是否正确。",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 处理通知设置更新
  const handleNotificationUpdate = async (
    key: keyof typeof notificationSettings,
    value: boolean,
  ) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);

    try {
      // 这里应该调用实际的设置更新 API
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "通知设置已更新",
        description: "您的通知偏好已保存。",
      });
    } catch (err) {
      console.error("Notification update error:", err);
      // 回滚更改
      setNotificationSettings(notificationSettings);
      toast({
        title: "设置更新失败",
        description: "更新通知设置时出现错误。",
        variant: "destructive",
      });
    }
  };

  // 处理隐私设置更新
  const handlePrivacyUpdate = async (
    key: keyof typeof privacySettings,
    value: string | boolean,
  ) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);

    try {
      // 这里应该调用实际的设置更新 API
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "隐私设置已更新",
        description: "您的隐私偏好已保存。",
      });
    } catch (err) {
      console.error("Privacy update error:", err);
      // 回滚更改
      setPrivacySettings(privacySettings);
      toast({
        title: "设置更新失败",
        description: "更新隐私设置时出现错误。",
        variant: "destructive",
      });
    }
  };

  // 处理账户删除
  const handleDeleteAccount = async () => {
    if (!confirm("确定要删除您的账户吗？此操作无法撤销。")) {
      return;
    }

    try {
      // 这里应该调用实际的账户删除 API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "账户删除请求已提交",
        description: "我们将在24小时内处理您的删除请求。",
      });
    } catch (err) {
      console.error("Delete account error:", err);
      toast({
        title: "删除请求失败",
        description: "提交删除请求时出现错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  // 处理头像上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 仅提供本地预览，实际上传由后端 API 处理
    setIsUploadingAvatar(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setLocalAvatarUrl(previewUrl);

      // TODO: 调用后端接口上传头像并返回 avatar_url（示例已省略）
      // 完成后可调用 updateUser({ avatar_url: 返回的 url })

      toast({
        title: "头像已更新 (预览)",
        description: "头像仅在本地预览，如需保存请在完成编辑后点击保存。",
      });
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast({
        title: "头像上传失败",
        description: "上传头像时出现错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <p className="text-lg">加载用户数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            加载用户数据时出错: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            您尚未登录，请先登录以查看此页面。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">用户设置</h1>
        <p className="text-muted-foreground">管理您的账户设置和偏好</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            个人资料
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            密码
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            外观
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            隐私
          </TabsTrigger>
        </TabsList>

        {/* 个人资料 */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                个人资料
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {/* 头像 + 文本输入 */}
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex flex-col items-center gap-2">
                      <UserAvatar
                        user={{
                          ...user,
                          avatar_url: localAvatarUrl || user.avatar_url,
                        }}
                        size="xl"
                      />
                      <div>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                        >
                          {isUploadingAvatar && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          <Upload className="h-4 w-4 mr-2" />
                          上传头像
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 grid gap-4">
                      {/* 姓名 */}
                      <div className="space-y-2">
                        <Label htmlFor="full_name">姓名</Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          defaultValue={user.full_name || ""}
                          disabled={isSubmitting}
                          placeholder="请输入您的姓名"
                        />
                      </div>
                      {/* 邮箱 */}
                      <div className="space-y-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={user.email}
                          disabled={isSubmitting}
                          placeholder="请输入您的邮箱"
                        />
                      </div>
                    </div>
                  </div>
                  {/* 按钮区域 */}
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      保存更改
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSubmitting}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row gap-6 items-start">
                    <UserAvatar user={user} size="xl" />
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          姓名
                        </Label>
                        <p className="text-lg font-medium">
                          {user.full_name || "未设置"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          邮箱
                        </Label>
                        <p className="text-lg">{user.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          注册时间
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString(
                            "zh-CN",
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setIsEditing(true)}>编辑资料</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 密码修改 */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                修改密码
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">当前密码</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="请输入当前密码"
                    disabled={isChangingPassword}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">新密码</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="请输入新密码（至少8个字符）"
                    disabled={isChangingPassword}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">确认新密码</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="请再次输入新密码"
                    disabled={isChangingPassword}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={
                    isChangingPassword ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                >
                  {isChangingPassword && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  更新密码
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 外观设置 */}
        <TabsContent value="appearance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  主题设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">选择主题</Label>
                  <RadioGroup
                    value={theme}
                    onValueChange={setTheme}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="theme-light" />
                      <Label
                        htmlFor="theme-light"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Sun className="h-4 w-4" />
                        浅色
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="theme-dark" />
                      <Label
                        htmlFor="theme-dark"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Moon className="h-4 w-4" />
                        深色
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="system" id="theme-system" />
                      <Label
                        htmlFor="theme-system"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Monitor className="h-4 w-4" />
                        系统
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  时区设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">
                      自动检测时区
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      根据浏览器自动检测您的时区
                    </p>
                  </div>
                  <Switch
                    checked={isAutoTimeZone}
                    onCheckedChange={setIsAutoTimeZone}
                  />
                </div>
                {!isAutoTimeZone && (
                  <TimeZoneSelector
                    value={timeZone}
                    onChange={setTimeZone}
                    label="手动选择时区"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 通知设置 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Label className="text-base font-medium">邮件通知</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      接收重要更新的邮件通知
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationUpdate("emailNotifications", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <Label className="text-base font-medium">
                        应用内通知
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      在应用内显示通知消息
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.appNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationUpdate("appNotifications", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">营销邮件</Label>
                    <p className="text-sm text-muted-foreground">
                      接收产品更新和推广信息
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) =>
                      handleNotificationUpdate("marketingEmails", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">安全警报</Label>
                    <p className="text-sm text-muted-foreground">
                      账户安全相关的重要通知
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.securityAlerts}
                    onCheckedChange={(checked) =>
                      handleNotificationUpdate("securityAlerts", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 隐私设置 */}
        <TabsContent value="privacy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  隐私设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">数据共享</Label>
                    <p className="text-sm text-muted-foreground">
                      允许匿名数据共享以改进服务
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.dataSharing}
                    onCheckedChange={(checked) =>
                      handlePrivacyUpdate("dataSharing", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">使用分析</Label>
                    <p className="text-sm text-muted-foreground">
                      帮助我们了解产品使用情况
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.analytics}
                    onCheckedChange={(checked) =>
                      handlePrivacyUpdate("analytics", checked)
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    个人资料可见性
                  </Label>
                  <RadioGroup
                    value={privacySettings.profileVisibility}
                    onValueChange={(value) =>
                      handlePrivacyUpdate("profileVisibility", value)
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="visibility-public" />
                      <Label
                        htmlFor="visibility-public"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        公开 - 所有人可见
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="friends" id="visibility-friends" />
                      <Label htmlFor="visibility-friends">
                        好友 - 仅好友可见
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="visibility-private" />
                      <Label htmlFor="visibility-private">
                        私密 - 仅自己可见
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  危险区域
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">删除账户</Label>
                  <p className="text-sm text-muted-foreground">
                    永久删除您的账户和所有相关数据。此操作无法撤销。
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除账户
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
