"use client";

import { useActionState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { passwordResetConfirm } from "@/components/actions/password-reset-action";
import { SubmitButton } from "@/components/ui/submitButton";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";
import { FieldError, FormError } from "@/components/ui/FormError";
import Link from "next/link";

function ResetPasswordForm() {
  const [state, dispatch] = useActionState(passwordResetConfirm, undefined);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const { user, isLoading } = useAuth();

  // 用户已登录时重定向到首页
  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // 重置成功后的重定向逻辑
  useEffect(() => {
    if ((state as any)?.message) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [(state as any)?.message, router]);

  if (!token) {
    return notFound();
  }

  const serverError = (state as any)?.server_validation_error;
  const errors = (state as any)?.errors;
  const success = (state as any)?.message;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4 relative overflow-hidden">
      <div className="absolute w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 bg-[length:30px_30px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        <form action={dispatch}>
          <div className="text-card-foreground w-full max-w-sm shadow-lg border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl">
            <div className="flex flex-col p-6 space-y-1 pb-2">
              <div className="relative mx-auto w-12 h-12 mb-3 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-md" />
                <Image
                  src="/images/logo.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="relative z-10 transform transition-transform hover:scale-110"
                />
              </div>
              <h3 className="tracking-tight text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                重置您的密码
              </h3>
              <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                请输入新密码并确认。
              </p>
            </div>
            <div className="p-6 grid gap-4 pt-2">
              {serverError && <FormError state={state} />}

              <div className="grid gap-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="至少8个字符，包含大写字母和特殊字符"
                    required
                  />
                </div>
                {errors?.password && (
                  <FieldError state={state} field="password" />
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">确认密码</Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    placeholder="再次输入相同的密码"
                    required
                  />
                </div>
                {errors?.passwordConfirm && (
                  <FieldError state={state} field="passwordConfirm" />
                )}
              </div>

              <input
                id="resetToken"
                name="resetToken"
                type="hidden"
                value={token}
                readOnly
              />

              {!success && (
                <div className="relative group mt-2">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300" />
                  <SubmitButton>重置密码</SubmitButton>
                </div>
              )}

              {success && (
                <div
                  data-testid="success-message"
                  className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-800 dark:text-green-200 text-center"
                >
                  {success}
                </div>
              )}

              <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                <Link
                  href="/login"
                  className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                >
                  返回登录
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
