"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// 创建一个内部组件处理参数
function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    // 从URL获取token参数
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    const errorMessage = searchParams.get("message");

    // 处理错误情况
    if (error) {
      console.error("OAuth error:", error, errorMessage);
      router.push(`/login?error=${error}&message=${errorMessage || "Authentication failed"}`);
      return;
    }

    // 如果没有token, 重定向到登录页面
    if (!token) {
      console.error("No token provided");
      router.push("/login?error=no_token");
      return;
    }

    // 使用auth hook的login方法设置cookie
    try {
      console.log("Setting token from Google login");
      login(token);
      
      // 添加延迟以确保token被设置和处理
      setTimeout(() => {
        console.log("Navigating to dashboard after Google login");
        router.push('/dashboard');
      }, 500);
    } catch (error) {
      console.error("Error processing Google login token:", error);
      router.push("/login?error=token_processing_error");
    }
  }, [searchParams, router, login]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">正在处理登录...</h1>
      <p>请稍候，正在完成您的登录。</p>
    </div>
  );
}

// 主组件使用Suspense包装内容组件
export default function GoogleAuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h1 className="text-2xl font-bold">加载中...</h1>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
