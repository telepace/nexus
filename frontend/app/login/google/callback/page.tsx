"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

// 创建一个内部组件处理参数
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    // 从URL获取token参数
    const token = searchParams.get("token");
    const error = searchParams.get("error");
    const errorMessage = searchParams.get("message");

    if (error) {
      console.error("OAuth error:", error, errorMessage);
      router.push(
        `/login?error=${error}&message=${errorMessage || "Authentication failed"}`,
      );
      return;
    }

    if (!token) {
      console.error("No token provided");
      router.push("/login?error=no_token");
      return;
    }

    // 存储token并重定向到仪表板
    login(token);
    router.push("/dashboard");
  }, [router, searchParams, login]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Processing authentication...</h1>
      <p>Please wait while we complete your sign in.</p>
    </div>
  );
}

// 主组件使用Suspense包装内容组件
export default function GoogleAuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
