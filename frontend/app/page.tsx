"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { IconInnerShadowTop } from "@tabler/icons-react";
import { detectLocale } from "@/lib/i18n";

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return; // 等待登录状态检查完成
    }

    const locale = detectLocale();

    if (user) {
      // 用户已登录，跳转到 home 页面
      router.replace(`/${locale}/home`);
    } else {
      // 用户未登录，显示着陆页
      setShowLanding(true);
    }
  }, [router, user, isLoading]);

  if (isLoading) {
    return <Loading />;
  }

  if (showLanding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/8 shadow-lg">
                <IconInnerShadowTop className="w-12 h-12 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              欢迎使用 <span className="text-primary">Nexus</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
              强大的内容管理和知识整理平台，让您的信息管理变得更加高效
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3">
                <Link href={`/${detectLocale()}/login`}>立即登录</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-8 py-3"
              >
                <Link href={`/${detectLocale()}/register`}>免费注册</Link>
              </Button>
            </div>

            {/* Features */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconInnerShadowTop className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">智能整理</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  自动分类和标签，让您的内容井井有条
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconInnerShadowTop className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">快速搜索</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  强大的搜索功能，瞬间找到您需要的信息
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconInnerShadowTop className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">多平台同步</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  跨设备无缝同步，随时随地访问您的内容
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <Loading />;
}
