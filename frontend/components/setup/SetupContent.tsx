"use client";

import { useState } from "react";
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
import { ExtensionLauncher } from "./ExtensionLauncher";

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

const CompleteStep = () => (
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
    </div>

    <div className="mt-6 pt-6 border-t">
      <h4 className="text-lg font-medium text-center mb-4">启用浏览器侧边栏</h4>
      <ExtensionLauncher />
    </div>
  </div>
);

const StepComponents = [WelcomeStep, PreferencesStep, CompleteStep];

export function SetupContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < SETUP_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 完成设置，重定向到仪表盘
      router.push("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = StepComponents[currentStep];

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
