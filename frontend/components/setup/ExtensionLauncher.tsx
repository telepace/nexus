"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PanelRightOpen, ExternalLink, AlertCircle, Check } from "lucide-react";
import { isExtensionInstalled, openSidebar } from "@/lib/extension-utils";
import { motion, AnimatePresence } from "framer-motion";

export function ExtensionLauncher() {
  const [extensionInstalled, setExtensionInstalled] = useState<boolean | null>(
    null,
  );
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // 检查扩展是否已安装
  useEffect(() => {
    const checkExtension = async () => {
      const installed = await isExtensionInstalled();
      setExtensionInstalled(installed);
    };

    checkExtension();
  }, []);

  // 处理打开侧边栏
  const handleOpenSidebar = async () => {
    const success = await openSidebar();

    if (success) {
      setSidebarOpened(true);
      // 显示固定侧边栏的提示
      setTimeout(() => {
        setShowTooltip(true);
      }, 1000);

      // 一段时间后自动隐藏提示
      setTimeout(() => {
        setShowTooltip(false);
      }, 15000);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto relative overflow-visible">
      <CardHeader>
        <CardTitle className="text-xl">浏览器扩展</CardTitle>
        <CardDescription>
          启动 Nexus 侧边栏，体验更便捷的浏览体验
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {extensionInstalled === false && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-3 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">未检测到 Nexus 扩展</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                请先安装浏览器扩展以使用此功能
              </p>
            </div>
          </div>
        )}

        {extensionInstalled === true && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-3 rounded-md flex items-start gap-2">
            <Check className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">已安装 Nexus 扩展</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                您可以启动侧边栏使用更多功能
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center">
          <Button
            size="lg"
            className="gap-2 h-16 px-6 text-lg"
            disabled={extensionInstalled === false || sidebarOpened}
            onClick={handleOpenSidebar}
          >
            <PanelRightOpen className="h-6 w-6" />
            打开 Nexus 侧边栏
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <ExternalLink className="h-4 w-4" />
          <span>使用侧边栏可随时访问 Nexus 功能</span>
        </div>
      </CardFooter>

      {/* 侧边栏固定提示 */}
      <AnimatePresence>
        {showTooltip && (
          <div className="absolute right-[-280px] top-1/2 transform -translate-y-1/2 z-50">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                padding: "1rem",
                borderRadius: "0.375rem",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                width: "16rem",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "-8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 0,
                  height: 0,
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  borderRight: "8px solid var(--primary)",
                }}
              />
              <h4 className="font-bold text-sm mb-1">提示</h4>
              <p className="text-xs">
                点击侧边栏右上角的图钉图标{" "}
                <span className="inline-block mx-1">📌</span>{" "}
                可以固定侧边栏，方便随时使用
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}
