"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, Suspense, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

import { register } from "@/components/actions/register-action";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submitButton";
import { FieldError, FormError } from "@/components/ui/FormError";
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

export default function Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [state, dispatch] = useActionState(register, undefined);

  // 添加登录状态检查
  useEffect(() => {
    // 只有在加载完成且用户存在时才重定向
    if (!isLoading && user) {
      console.log("[RegisterPage] 用户已登录，重定向到仪表盘");
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  // 如果正在检查登录状态，显示加载提示
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center"></div>
    );
  }

  // Maintain form values when there's an error
  const handleSubmit = (formData: FormData) => {
    // Save current values before submitting
    setEmail(formData.get("email") as string);
    setPassword(formData.get("password") as string);
    setFullName(formData.get("full_name") as string);
    dispatch(formData);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4 relative overflow-hidden">
      {/* Wrap useSearchParams in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler setEmail={setEmail} />
      </Suspense>

      {/* Tech-inspired background elements */}
      <div className="absolute w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>

        {/* Tech grid lines */}
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 bg-[length:30px_30px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>
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
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            注册账号
          </h1>
        </div>

        <Card className="w-full rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transition-all duration-300 hover:shadow-blue-100 dark:hover:shadow-blue-900/20">
          <CardContent className="pt-6 px-6">
            <Button
              variant="outline"
              className="w-full py-6 border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all duration-300 mb-6 relative group overflow-hidden"
              type="button"
              onClick={() => initiateGoogleLogin()}
            >
              <div className="absolute inset-0 w-0 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/30 dark:to-transparent transition-all duration-500 group-hover:w-full"></div>
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
                使用 Google 账号注册
              </span>
            </Button>

            <div className="flex items-center gap-3 my-6">
              <Separator className="flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                或者
              </span>
              <Separator className="flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="full_name"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  姓名
                </Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="张三"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="relative h-11 border-slate-200 dark:border-slate-700 rounded-md focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 transition-all duration-300 bg-white dark:bg-slate-800"
                  />
                </div>
                <FieldError state={state} field="full_name" />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  邮箱
                </Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="relative h-11 border-slate-200 dark:border-slate-700 rounded-md focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 transition-all duration-300 bg-white dark:bg-slate-800"
                  />
                </div>
                <FieldError state={state} field="email" />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  密码
                </Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="请输入密码"
                    className="relative h-11 border-slate-200 dark:border-slate-700 rounded-md focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:border-slate-400 transition-all duration-300 bg-white dark:bg-slate-800"
                  />
                </div>
                <FieldError state={state} field="password" />
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <SubmitButton
                  text="注册"
                  className="relative w-full h-11 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 dark:from-slate-50 dark:to-white dark:text-slate-800 transition-all duration-300"
                />
              </div>
              <FormError state={state} className="text-center" />
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          已有账号？{" "}
          <Link
            href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
          >
            登录
          </Link>
        </div>
      </div>
    </div>
  );
}
