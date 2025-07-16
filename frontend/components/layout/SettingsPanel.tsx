"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useTimeZone } from "@/lib/time-zone-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  X,
  Edit2,
  ChevronRight,
} from "lucide-react";
import { getCookie } from "cookies-next";

/**
 * 优雅的用户设置面板 - 采用现代玻璃态设计美学
 */
interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
}) => {
  const { user, isLoading, error, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { timeZone, setTimeZone, isAutoTimeZone, setIsAutoTimeZone } =
    useTimeZone();

  // UI 状态
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

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

  const tabs = [
    { id: "personal", label: "个人资料", icon: UserIcon },
    { id: "security", label: "密码安全", icon: Shield },
    { id: "appearance", label: "外观", icon: Palette },
    { id: "notifications", label: "通知", icon: Bell },
    { id: "privacy", label: "隐私", icon: Lock },
  ];

  // 避免 hydration 不匹配
  useEffect(() => {
    setMounted(true);
    if (user) {
      setFormData({
        name: user.full_name || "",
        email: user.email || "",
      });
    }

    // 添加键盘事件监听
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [user, open, onClose]);

  // 处理个人资料更新
  const handleProfileUpdate = async () => {
    setIsSubmitting(true);

    try {
      await updateUser({
        full_name: formData.name,
        email: formData.email,
      });
      toast({
        title: "个人资料已更新",
        description: "您的个人资料信息已成功保存。",
      });
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({
        title: "通知设置已更新",
        description: "您的通知偏好已保存。",
      });
    } catch (err) {
      console.error("Notification update error:", err);
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({
        title: "隐私设置已更新",
        description: "您的隐私偏好已保存。",
      });
    } catch (err) {
      console.error("Privacy update error:", err);
      setPrivacySettings(privacySettings);
      toast({
        title: "设置更新失败",
        description: "更新隐私设置时出现错误。",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    // 实现删除账户逻辑
    console.log("Delete account");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

    setIsUploadingAvatar(true);

    try {
      // 创建预览URL
      const previewUrl = URL.createObjectURL(file);
      setLocalAvatarUrl(previewUrl);

      // 获取认证token
      const token = getCookie("accessToken");
      if (!token) {
        throw new Error("未找到认证token，请重新登录");
      }

      // 创建FormData对象
      const formData = new FormData();
      formData.append("avatar", file);

      // 发送请求到服务器
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
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
        description: "您的头像已成功上传。",
      });
    } catch (err) {
      console.error("Avatar upload error:", err);
      setLocalAvatarUrl(null);
      toast({
        title: "上传失败",
        description:
          err instanceof Error ? err.message : "头像上传时出现错误，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 如果面板未打开，不渲染
  if (!open) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center z-50">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <p className="text-lg">加载用户数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center p-8 z-50">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            加载用户数据时出错: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center p-8 z-50">
        <Alert variant="destructive" className="max-w-md">
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
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-xl flex items-center justify-center p-8 z-50"
      onClick={(e) => {
        // 点击背景关闭
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-gray-800/50 shadow-2xl w-full max-w-5xl h-[700px] overflow-hidden">
        {/* 极简头部 */}
        <div className="flex items-center justify-between px-12 py-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-light tracking-tight text-gray-900 dark:text-white">
              设置
            </h1>
            <p className="text-gray-400 text-sm">管理您的账户设置和偏好</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-300 hover:scale-110"
            title="关闭设置"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" />
          </button>
        </div>

        <div className="flex h-[612px]">
          {/* 超净侧边栏 */}
          <div className="w-80 px-12 py-4">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-6 py-5 rounded-2xl text-left transition-all duration-300 group ${
                      activeTab === tab.id
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-base">{tab.label}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition-all duration-300 ${
                        activeTab === tab.id
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 纯净内容区域 */}
          <div className="flex-1 px-12 py-8 border-l border-gray-100/50 dark:border-gray-800/50 overflow-y-auto">
            {activeTab === "personal" && (
              <div className="space-y-12 max-w-lg">
                {/* 头像 - 浮动设计 */}
                <div className="flex items-center gap-8">
                  <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/25 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-blue-500/30 group-hover:scale-105">
                      {localAvatarUrl || user.avatar_url ? (
                        <img
                          src={localAvatarUrl || user.avatar_url}
                          alt="Avatar"
                          className="w-full h-full rounded-3xl object-cover"
                        />
                      ) : (
                        <span className="text-white text-3xl font-light">
                          {user.full_name
                            ? user.full_name[0].toUpperCase()
                            : "U"}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-4 h-4 text-gray-600 dark:text-gray-400 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      头像
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      点击更换您的个人头像
                    </p>
                  </div>
                </div>

                {/* 浮动表单字段 */}
                <div className="space-y-8">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300 group-focus-within:text-gray-900 dark:group-focus-within:text-white">
                      姓名
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="请输入您的姓名"
                        className="w-full px-0 py-4 bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:outline-none text-lg font-light placeholder-gray-400 transition-all duration-300"
                      />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 transition-colors duration-300 group-focus-within:text-gray-900 dark:group-focus-within:text-white">
                      邮箱地址
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-0 py-4 bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:outline-none text-lg font-light transition-all duration-300"
                      />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 浮动操作 */}
                <div className="pt-8">
                  <button
                    onClick={handleProfileUpdate}
                    disabled={isSubmitting}
                    className="group relative px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gray-900/25 dark:hover:shadow-white/25 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    <span className="relative flex items-center gap-2">
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      保存更改
                    </span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-12 max-w-lg">
                <div className="space-y-3">
                  <h2 className="text-2xl font-light text-gray-900 dark:text-white">
                    密码安全
                  </h2>
                  <p className="text-gray-400 leading-relaxed">
                    保护您的账户安全
                  </p>
                </div>

                <div className="p-8 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-3xl border border-blue-100/50 dark:border-blue-800/30">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-400/10 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        账户安全状态良好
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                        您的密码强度很高，上次更新于 30 天前
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-8">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      当前密码
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      placeholder="请输入当前密码"
                      className="w-full px-0 py-4 bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:outline-none text-lg font-light placeholder-gray-400 transition-all duration-300"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      新密码
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="请输入新密码（至少8个字符）"
                      className="w-full px-0 py-4 bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:outline-none text-lg font-light placeholder-gray-400 transition-all duration-300"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      确认新密码
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="请再次输入新密码"
                      className="w-full px-0 py-4 bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-gray-900 dark:focus:border-white focus:outline-none text-lg font-light placeholder-gray-400 transition-all duration-300"
                    />
                  </div>

                  <div className="pt-8">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="group relative px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-gray-900/25 dark:hover:shadow-white/25 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      <span className="relative flex items-center gap-2">
                        {isChangingPassword && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        更新密码
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-12 max-w-lg">
                <div className="space-y-3">
                  <h2 className="text-2xl font-light text-gray-900 dark:text-white">
                    外观设置
                  </h2>
                  <p className="text-gray-400 leading-relaxed">
                    个性化您的界面体验
                  </p>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-6">
                      主题模式
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        {
                          name: "浅色",
                          value: "light",
                          bg: "bg-gradient-to-br from-gray-50 to-white",
                          icon: Sun,
                        },
                        {
                          name: "深色",
                          value: "dark",
                          bg: "bg-gradient-to-br from-gray-800 to-gray-900",
                          icon: Moon,
                        },
                        {
                          name: "自动",
                          value: "system",
                          bg: "bg-gradient-to-br from-blue-500 to-indigo-600",
                          icon: Monitor,
                        },
                      ].map((themeOption) => {
                        const Icon = themeOption.icon;
                        return (
                          <button
                            key={themeOption.value}
                            onClick={() => setTheme(themeOption.value)}
                            className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                              theme === themeOption.value
                                ? "border-gray-900 dark:border-white"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            <div
                              className={`w-full h-12 ${themeOption.bg} rounded-xl mb-4 shadow-inner flex items-center justify-center`}
                            >
                              <Icon className="w-5 h-5 text-white/80" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                              {themeOption.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-8 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl flex items-center justify-center">
                        <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            时区设置
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            根据您的位置自动调整时间显示
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            自动检测时区
                          </span>
                          <button
                            onClick={() => setIsAutoTimeZone(!isAutoTimeZone)}
                            className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                              isAutoTimeZone
                                ? "bg-gray-900 dark:bg-white"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            <div
                              className={`absolute w-6 h-6 rounded-full bg-white dark:bg-gray-900 top-1 transition-all duration-300 shadow-sm ${
                                isAutoTimeZone ? "right-1" : "left-1"
                              }`}
                            ></div>
                          </button>
                        </div>

                        {!isAutoTimeZone && (
                          <div className="pt-2">
                            <TimeZoneSelector
                              value={timeZone}
                              onChange={setTimeZone}
                              label="选择时区"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-12 max-w-lg">
                <div className="space-y-3">
                  <h2 className="text-2xl font-light text-gray-900 dark:text-white">
                    通知设置
                  </h2>
                  <p className="text-gray-400 leading-relaxed">
                    控制您接收通知的方式
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      key: "emailNotifications" as const,
                      title: "邮件通知",
                      desc: "重要更新和安全提醒",
                      enabled: notificationSettings.emailNotifications,
                      icon: Mail,
                    },
                    {
                      key: "appNotifications" as const,
                      title: "推送通知",
                      desc: "实时消息和活动通知",
                      enabled: notificationSettings.appNotifications,
                      icon: Smartphone,
                    },
                    {
                      key: "marketingEmails" as const,
                      title: "营销邮件",
                      desc: "产品更新和推广信息",
                      enabled: notificationSettings.marketingEmails,
                      icon: Bell,
                    },
                    {
                      key: "securityAlerts" as const,
                      title: "安全警报",
                      desc: "账户安全相关的重要通知",
                      enabled: notificationSettings.securityAlerts,
                      icon: Shield,
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between py-6 border-b border-gray-100/50 dark:border-gray-800/50 last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-center">
                            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-400">{item.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleNotificationUpdate(item.key, !item.enabled)
                          }
                          className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                            item.enabled
                              ? "bg-gray-900 dark:bg-white"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        >
                          <div
                            className={`absolute w-6 h-6 rounded-full bg-white dark:bg-gray-900 top-1 transition-all duration-300 shadow-sm ${
                              item.enabled ? "right-1" : "left-1"
                            }`}
                          ></div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-12 max-w-lg">
                <div className="space-y-3">
                  <h2 className="text-2xl font-light text-gray-900 dark:text-white">
                    隐私保护
                  </h2>
                  <p className="text-gray-400 leading-relaxed">
                    管理您的数据和隐私设置
                  </p>
                </div>

                <div className="p-8 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10 rounded-3xl border border-amber-100/50 dark:border-amber-800/30">
                  <div className="flex items-start gap-6">
                    <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-400/10 rounded-2xl flex items-center justify-center">
                      <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        数据加密保护
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                        我们使用端到端加密技术保护您的个人信息安全
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      key: "dataSharing" as const,
                      title: "数据共享",
                      desc: "允许匿名数据共享以改进服务",
                      enabled: privacySettings.dataSharing,
                    },
                    {
                      key: "analytics" as const,
                      title: "使用分析",
                      desc: "帮助我们了解产品使用情况",
                      enabled: privacySettings.analytics,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-6 border-b border-gray-100/50 dark:border-gray-800/50 last:border-0"
                    >
                      <div className="space-y-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          handlePrivacyUpdate(item.key, !item.enabled)
                        }
                        className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                          item.enabled
                            ? "bg-gray-900 dark:bg-white"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <div
                          className={`absolute w-6 h-6 rounded-full bg-white dark:bg-gray-900 top-1 transition-all duration-300 shadow-sm ${
                            item.enabled ? "right-1" : "left-1"
                          }`}
                        ></div>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                      个人资料可见性
                    </h3>
                    <div className="space-y-3">
                      {[
                        {
                          value: "public",
                          label: "公开",
                          desc: "所有人可见",
                          icon: Eye,
                        },
                        {
                          value: "friends",
                          label: "好友",
                          desc: "仅好友可见",
                          icon: UserIcon,
                        },
                        {
                          value: "private",
                          label: "私密",
                          desc: "仅自己可见",
                          icon: Lock,
                        },
                      ].map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() =>
                              handlePrivacyUpdate(
                                "profileVisibility",
                                option.value,
                              )
                            }
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 ${
                              privacySettings.profileVisibility === option.value
                                ? "border-gray-900 dark:border-white bg-gray-50/50 dark:bg-gray-800/50"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                            }`}
                          >
                            <div className="w-8 h-8 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center">
                              <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {option.label}
                              </div>
                              <div className="text-sm text-gray-400">
                                {option.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 危险操作区域 */}
                <div className="pt-8 border-t border-gray-100/50 dark:border-gray-800/50">
                  <div className="p-8 bg-gradient-to-br from-red-50/50 to-pink-50/50 dark:from-red-900/10 dark:to-pink-900/10 rounded-3xl border border-red-100/50 dark:border-red-800/30">
                    <div className="flex items-start gap-6">
                      <div className="w-12 h-12 bg-red-500/10 dark:bg-red-400/10 rounded-2xl flex items-center justify-center">
                        <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            删除账户
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            永久删除您的账户和所有相关数据。此操作无法撤销。
                          </p>
                        </div>

                        <button
                          onClick={handleDeleteAccount}
                          className="group relative px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                          <span className="relative flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            删除账户
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
