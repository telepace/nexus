"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { initiateGoogleLogin } from "@/components/actions/google-auth-action";

// SearchParams component to handle useSearchParams hook with Suspense
function SearchParamsHandler({
  setEmail,
}: { setEmail: (email: string) => void }) {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  // Set email in parent component
  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery, setEmail]);

  return null;
}

// CallbackUrlHandler component to handle callback URL
function CallbackUrlHandler({
  setCallbackUrl,
  setExtensionCallback,
}: {
  setCallbackUrl: (url: string) => void;
  setExtensionCallback: (url: string | null) => void;
}) {
  const searchParams = useSearchParams();
  const callbackUrlFromQuery = searchParams.get("callbackUrl") || "/dashboard";
  const extensionCallbackUrl = searchParams.get("extension_callback");

  useEffect(() => {
    setCallbackUrl(callbackUrlFromQuery);
    setExtensionCallback(extensionCallbackUrl);
  }, [
    callbackUrlFromQuery,
    extensionCallbackUrl,
    setCallbackUrl,
    setExtensionCallback,
  ]);

  return null;
}

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/setup");
  const [extensionCallback, setExtensionCallback] = useState<string | null>(
    null,
  );
  const [email, setEmail] = useState("test@example.com"); // 预填测试用户
  const [password, setPassword] = useState("password"); // 预填测试用户密码
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  // 添加登录状态检查
  useEffect(() => {
    // 只有在加载完成且用户存在时才重定向
    if (!isLoading && user) {
      console.log("[LoginPage] 用户已登录，检查是否需要重定向到扩展");

      // 如果存在扩展回调URL，则重定向到扩展
      if (extensionCallback) {
        // 构建带有token的URL，以便扩展获取认证信息
        const redirectUrl = `${extensionCallback}?token=${encodeURIComponent(user.token || "")}`;
        console.log("[LoginPage] 重定向到扩展:", redirectUrl);
        window.location.href = redirectUrl;
        return;
      }

      // 否则重定向到常规回调URL
      console.log("[LoginPage] 重定向到:", callbackUrl);
      router.push(callbackUrl);
    }
  }, [isLoading, user, router, callbackUrl, extensionCallback]);

  // 如果正在检查登录状态，显示加载提示
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center"></div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError("");
    setDebugInfo("");

    try {
      // Get API URL from env
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      // 修正登录端点
      const response = await fetch(`${apiUrl}/api/v1/login/access-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      const data = await response.json();

      // 添加调试信息
      setDebugInfo(JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.detail || "登录失败，请检查用户名和密码");
      }

      console.log("Login successful:", data);

      // 确保响应包含access_token
      if (!data.access_token) {
        throw new Error("登录响应缺少访问令牌");
      }

      // Store token using auth hook
      login(data.access_token);

      // Redirect to callback URL or dashboard
      router.push(callbackUrl);
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4 relative overflow-hidden">
      {/* Wrap useSearchParams in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler setEmail={setEmail} />
        <CallbackUrlHandler
          setCallbackUrl={setCallbackUrl}
          setExtensionCallback={setExtensionCallback}
        />
      </Suspense>

      {/* 如果来自扩展的请求，显示提示 */}
      {extensionCallback && (
        <div className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-md">
          来自 Nexus 浏览器扩展的登录请求
        </div>
      )}

      {/* Tech-inspired background elements */}
      <div className="absolute w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>

        {/* Tech grid lines */}
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 bg-size-[30px_30px] mask-[radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>
      </div>

      <div className="w-full max-w-md mb-8 relative z-10">
        <div className="text-center mb-8">
          <div className="relative mx-auto w-12 h-12 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-md"></div>
            <Image
              src="/images/logo.svg"
              alt="Logo"
              width={40}
              height={40}
              className="relative z-10 transform transition-transform hover:scale-110"
            />
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            登录
          </h1>
        </div>

        <Card className="w-full rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs transition-all duration-300 hover:shadow-blue-100 dark:hover:shadow-blue-900/20">
          <CardContent className="pt-6 px-6">
            <Button
              variant="outline"
              className="w-full py-6 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all duration-300 mb-6 relative group overflow-hidden"
              type="button"
              onClick={() => initiateGoogleLogin()}
            >
              <div className="absolute inset-0 w-0 bg-linear-to-r from-blue-50 to-transparent dark:from-blue-900/30 dark:to-transparent transition-all duration-500 group-hover:w-full"></div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                className="relative z-10"
              >
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path
                    fill="#4285F4"
                    d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                  />
                  <path
                    fill="#34A853"
                    d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                  />
                </g>
              </svg>
              <span className="text-sm text-slate-800 dark:text-slate-200 font-medium relative z-10">
                使用 Google 账号登录
              </span>
            </Button>

            <div className="flex items-center gap-3 my-6">
              <Separator className="flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                或者
              </span>
              <Separator className="flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  邮箱
                </Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    className="relative h-11 border-slate-200 dark:border-slate-700 rounded-md focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 transition-all duration-300 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    密码
                  </Label>
                  <Link
                    href={`/password-recovery${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                  >
                    忘记密码？
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="relative h-11 border-slate-200 dark:border-slate-700 rounded-md focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 transition-all duration-300 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-linear-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <Button
                  type="submit"
                  disabled={isLoggingIn}
                  className="relative w-full h-11 bg-linear-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 dark:from-slate-50 dark:to-white dark:text-slate-800 transition-all duration-300"
                >
                  {isLoggingIn ? "登录中..." : "登录"}
                </Button>
              </div>
            </form>

            {/* 测试用户信息 */}
            <div className="mt-4 p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                测试用户信息：
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                邮箱: test@example.com
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                密码: password
              </p>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                用户ID: d17ab34d-b82f-4756-a315-82fca4264c4e
              </p>
            </div>

            {/* 调试信息 */}
            {debugInfo && (
              <div className="mt-4 p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  调试信息：
                </p>
                <pre className="text-xs overflow-auto max-h-32">
                  {debugInfo}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          没有账号？{" "}
          <Link
            href={`/register${
              email ? `?email=${encodeURIComponent(email)}` : ""
            }`}
            className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
          >
            注册新账号
          </Link>
        </div>
      </div>
    </div>
  );
}
