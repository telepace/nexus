"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 创建一个独立的组件来处理登录逻辑
function GoogleAuthCallbackContent() {
  const [status, setStatus] = useState("处理中...");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // 从URL获取token参数
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    const errorMessage = searchParams.get("message");

    // 处理错误情况
    if (error) {
      console.error("OAuth error:", error, errorMessage);
      setStatus("登录失败，正在跳转到登录页面...");
      setTimeout(() => {
        router.push(
          `/login?error=${error}&message=${errorMessage || "Authentication failed"}`
        );
      }, 1500);
      return;
    }

    // 如果没有token, 重定向到登录页面
    if (!token) {
      console.error("No token provided");
      setStatus("未找到令牌，正在跳转到登录页面...");
      setTimeout(() => {
        router.push("/login?error=no_token");
      }, 1500);
      return;
    }

    // 直接设置cookie，不依赖于 useAuth
    try {
      console.log("Setting token from Google login");
      
      // 设置cookie
      const cookieValue = `accessToken=${token};path=/;max-age=${60 * 60 * 24 * 7}`;
      document.cookie = cookieValue;
      
      setStatus("登录成功，正在跳转到仪表盘...");
      
      // 跳转到仪表盘
      setTimeout(() => {
        console.log("Navigating to dashboard after Google login");
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("Error processing Google login token:", error);
      setStatus("处理登录令牌时出错，正在跳转到登录页面...");
      setTimeout(() => {
        router.push("/login?error=token_processing_error");
      }, 1500);
    }
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">登录处理中</h1>
      <p className="mt-4">{status}</p>
    </div>
  );
}

// 主页面组件，使用 Suspense 包装处理组件
export default function GoogleAuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">加载中...</h1>
      </div>
    }>
      <GoogleAuthCallbackContent />
    </Suspense>
  );
}
