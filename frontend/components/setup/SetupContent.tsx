"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ExtensionLauncher } from "./ExtensionLauncher";
import { useAuth } from "@/lib/auth"; // useAuth provides user and updateUser
import { getCookie } from "@/lib/client-auth"; // To get accessToken if needed, though user.token is preferred
import {
  getExtensionPluginId,
  saveTokenToExtension,
} from "@/lib/extension-utils";
import { useToast } from "@/components/ui/use-toast";

// 设置向导步骤
const SETUP_STEPS = ["欢迎", "个性化设置", "完成"];

// 定义步骤内容组件
const WelcomeStep = () => (
  <div className="space-y-4">
    <h3 className="text-2xl font-semibold">欢迎使用 Nexus</h3>
    <p className="text-muted-foreground">
      感谢您选择 Nexus。本向导将帮助您完成基本设置以便开始使用。
    </p>
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary p-2 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span>直观的用户界面</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary p-2 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span>强大的数据处理能力</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary p-2 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span>安全且可靠的云存储</span>
      </div>
    </div>
  </div>
);

const PreferencesStep = () => (
  <div className="space-y-4">
    <h3 className="text-2xl font-semibold">个性化设置</h3>
    <p className="text-muted-foreground">根据您的需求自定义 Nexus。</p>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium">暗色模式</h4>
          <p className="text-sm text-muted-foreground">启用暗色主题</p>
        </div>
        <Switch />
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium">通知</h4>
          <p className="text-sm text-muted-foreground">接收重要更新通知</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium">数据分析</h4>
          <p className="text-sm text-muted-foreground">启用匿名使用统计</p>
        </div>
        <Switch />
      </div>
    </div>
  </div>
);

type CompleteStepProps = {
  fromExtension?: boolean;
  onFinish?: () => void;
};

const CompleteStep = ({ fromExtension, onFinish }: CompleteStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-green-600 dark:text-green-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>
      <h3 className="text-2xl font-semibold mt-4">设置完成！</h3>
      <p className="text-muted-foreground">
        您已成功完成 Nexus 的初始设置。现在您可以开始体验全部功能。
      </p>

      {fromExtension && (
        <div className="mt-4 text-sm text-green-600 dark:text-green-400">
          您的浏览器扩展将自动配置，无需额外设置。
        </div>
      )}
    </div>

    <div className="mt-6 pt-6 border-t">
      <h4 className="text-lg font-medium text-center mb-4">启用浏览器侧边栏</h4>
      <ExtensionLauncher onSidebarOpened={onFinish} />
    </div>
  </div>
);

const StepComponents = [WelcomeStep, PreferencesStep];

/**
 * Handles the setup process for a user, including fetching and processing extension plugin IDs,
 * sending tokens to extensions, and updating user setup status via API.
 *
 * This function manages multiple steps in the setup process:
 * 1. Fetches or retrieves `plugin_id` from URL parameters or extensions.
 * 2. Marks the setup as complete on the server by updating user data.
 * 3. Sends a token to an extension if necessary and redirects based on callback URLs.
 * 4. Redirects to the dashboard after completing all steps.
 *
 * @returns A React component that renders the setup process UI.
 */
export function SetupContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const { user, updateUser } = useAuth(); // Destructure updateUser from useAuth
  const searchParamsObj = useSearchParams();
  const [extensionPluginId, setExtensionPluginId] = useState<string | null>(
    null,
  );
  const [extensionCallback, setExtensionCallback] = useState<string | null>(
    null,
  );
  const [tokenSent, setTokenSent] = useState(false);
  const { toast } = useToast();

  // 检查URL参数中是否包含plugin_id和extension_callback
  useEffect(() => {
    // 确保 searchParamsObj 存在
    if (searchParamsObj) {
      const pluginId = searchParamsObj.get?.("plugin_id") || null;
      const callback = searchParamsObj.get?.("extension_callback") || null;

      // 如果URL中有plugin_id，则保存它
      if (pluginId) {
        console.log("Setup页面从URL获取了plugin_id:", pluginId);
        setExtensionPluginId(pluginId);
      } else {
        // 尝试从扩展中获取plugin_id
        async function fetchPluginId() {
          const id = await getExtensionPluginId();
          if (id) {
            console.log("Setup页面从扩展获取了plugin_id:", id);
            setExtensionPluginId(id);
          }
        }
        fetchPluginId();
      }

      if (callback) {
        setExtensionCallback(callback);
      }
    }
  }, [searchParamsObj]);

  // 在完成设置时向扩展发送Token
  /**
   * Handles the completion of the setup process by marking it as complete via API and sending a token to an extension if applicable.
   *
   * The function performs several steps: it first checks if the setup has already been marked as complete to prevent duplicate execution.
   * It then attempts to mark the user's setup as complete by making an API call. If successful, it updates the local authentication state.
   * Next, if a user token and extension plugin ID are available, it sends the token to the extension and handles any success or failure scenarios.
   * Finally, if not redirected elsewhere, it redirects the user to the dashboard.
   *
   * @returns void
   */
  const handleFinish = async () => {
    if (tokenSent) return; // Prevent duplicate execution

    // 1. Persist setup completion status
    try {
      console.log(
        "[SetupContent] Attempting to mark setup as complete via API.",
      );
      const token = user?.token || getCookie("accessToken");

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "User token not found. Cannot complete setup.",
          variant: "destructive",
        });
        return; // Stop if no token
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_setup_complete: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to mark setup as complete.",
        );
      }

      console.log(
        "[SetupContent] Setup successfully marked as complete via API.",
      );
      // Update local auth state
      await updateUser({ is_setup_complete: true });
      toast({
        title: "Setup Complete",
        description: "Your setup preferences have been saved.",
        variant: "default",
      });
    } catch (error) {
      console.error("[SetupContent] Error marking setup as complete:", error);
      toast({
        title: "Error Completing Setup",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
      return; // Do not proceed if API call fails
    }

    // 2. Existing logic for extension token sending (if applicable)
    if (user?.token && extensionPluginId) {
      try {
        console.log(
          "[SetupContent] Setup page attempting to send Token to extension",
        );
        const success = await saveTokenToExtension(
          user.token,
          extensionPluginId,
        );

        if (success) {
          setTokenSent(true); // Mark token as sent
          toast({
            title: "Extension Configured",
            description: "Nexus extension has been set up.",
            variant: "default",
          });

          // If there's an extension callback, redirect there
          if (extensionCallback) {
            console.log(
              `[SetupContent] Redirecting to extension callback: ${extensionCallback}`,
            );
            window.location.href = `${extensionCallback}?token=${encodeURIComponent(user.token)}`;
            return; // Important to return after redirection
          }
        } else {
          toast({
            title: "Extension Configuration Failed",
            description: "Could not send Token to the extension.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          "[SetupContent] Error sending Token to extension:",
          error,
        );
        // Non-critical, so proceed to dashboard redirection
      }
    }

    // 3. Redirect to dashboard (if not redirected to extension callback)
    console.log("[SetupContent] Redirecting to /dashboard");
    router.push("/dashboard");
  };

  const handleNext = () => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 完成设置，调用处理函数
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 动态添加完成步骤组件
  const AllStepComponents = [
    ...StepComponents,
    (props: CompleteStepProps) => (
      <CompleteStep
        fromExtension={!!extensionPluginId}
        onFinish={handleFinish}
        {...props}
      />
    ),
  ];

  const CurrentStepComponent = AllStepComponents[currentStep];

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-lg">
      <CardHeader className="pb-0">
        <div className="py-2">
          <Stepper
            steps={SETUP_STEPS}
            currentStep={currentStep}
            className="mb-8 px-4"
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentStepComponent />
          </motion.div>
        </AnimatePresence>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          上一步
        </Button>
        <Button onClick={handleNext}>
          {currentStep === SETUP_STEPS.length - 1 ? "完成" : "下一步"}
        </Button>
      </CardFooter>
    </Card>
  );
}
