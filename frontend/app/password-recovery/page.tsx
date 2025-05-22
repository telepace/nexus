"use client";

import { useActionState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submitButton";
import { useAuth } from "@/lib/auth";
import { passwordReset } from "@/components/actions/password-reset-action";
import { useEffect, useState, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormError, FieldError } from "@/components/ui/FormError";

// SearchParams component to handle useSearchParams hook with Suspense
function SearchParamsHandler({
  setInitialEmail,
}: { setInitialEmail: (email: string) => void }) {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  // Set email in parent component
  useEffect(() => {
    setInitialEmail(emailFromQuery);
  }, [emailFromQuery, setInitialEmail]);

  return null;
}

export default function Page() {
  const [state, dispatch] = useActionState(passwordReset, undefined);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [initialEmail, setInitialEmail] = useState("");

  useEffect(() => {
    // 如果用户已登录，重定向到首页
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  const success = state?.message;
  const serverError = state?.server_validation_error;
  const errors = state?.errors;

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-4">
      {/* Wrap useSearchParams in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler setInitialEmail={setInitialEmail} />
      </Suspense>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-3">
            <Image
              src="/images/logo.svg"
              alt="Logo"
              width={40}
              height={40}
              className="dark:invert"
            />
          </div>
          <CardTitle className="text-2xl font-bold">找回密码</CardTitle>
          <CardDescription>
            输入您的邮箱，我们将发送重置密码的链接
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-green-700 dark:text-green-300 text-center mb-4">
              {success}
              <div className="mt-3">
                <Link
                  href="/login"
                  className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                >
                  返回登录
                </Link>
              </div>
            </div>
          ) : (
            <form action={dispatch} className="space-y-4">
              {serverError && <FormError state={state} />}

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={initialEmail}
                  placeholder="example@example.com"
                  className="w-full"
                  required
                />
                {errors?.email && <FieldError state={state} field="email" />}
              </div>

              <SubmitButton
                data-testid="reset-password-submit"
                className="w-full"
              >
                发送重置链接
              </SubmitButton>

              <div className="text-center text-sm text-muted-foreground mt-4">
                <Link
                  href="/login"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  返回登录
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
