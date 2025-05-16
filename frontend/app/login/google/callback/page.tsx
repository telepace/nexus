"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// 创建一个内部组件处理参数
function CallbackContent() {
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
      router.push(`/login?error=${error}&message=${errorMessage || "Authentication failed"}`);
      return;
    }

    // 如果没有token, 重定向到登录页面
    if (!token) {
      console.error("No token provided");
      router.push("/login?error=no_token");
      return;
    }

    // 客户端处理token和Cookie
    const handleToken = async () => {
      try {
        // 使用fetch API设置cookie
        const response = await fetch('/api/auth/set-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          throw new Error('Failed to set authentication token');
        }

        // 成功后导航到dashboard
        router.push('/dashboard');
      } catch (error) {
        console.error("Error setting token:", error);
        router.push("/login?error=token_processing_error");
      }
    };

    handleToken();
  }, [searchParams, router]);

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
