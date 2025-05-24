"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { passwordResetConfirm } from "@/components/actions/password-reset-action";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";
import { FieldError, FormError } from "@/components/ui/FormError";
import Link from "next/link";

interface PasswordResetState {
  message?: string;
  server_validation_error?: string;
  errors?: Record<string, string[]>;
  success?: boolean;
}

function ResetPasswordForm() {
  const [state, setState] = useState<PasswordResetState | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const { user, isLoading } = useAuth();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  // Redirect after successful password reset
  useEffect(() => {
    if (state?.message) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.message, router]);

  if (!token) {
    return <div>Invalid token</div>;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await passwordResetConfirm(undefined, formData);
      setState(result);
    } catch {
      setState({
        server_validation_error: "Submission failed, please try again",
      });
    } finally {
      setIsPending(false);
    }
  }

  const serverError = state?.server_validation_error;
  const errors = state?.errors;
  const success = state?.message;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-4 relative overflow-hidden">
      <div className="absolute w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-1/3 h-1/3 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/20 bg-[length:30px_30px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        <form onSubmit={handleSubmit}>
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
                Reset Your Password
              </h3>
              <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                Please enter and confirm your new password.
              </p>
            </div>
            <div className="p-6 grid gap-4 pt-2">
              {serverError && <FormError state={state} />}

              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="至少8个字符"
                    required
                  />
                </div>
                {errors?.password && (
                  <FieldError state={state} field="password" />
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">Confirm Password</Label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500" />
                  <Input
                    id="passwordConfirm"
                    name="passwordConfirm"
                    type="password"
                    placeholder="Enter the same password again"
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
                  <button
                    type="submit"
                    className="relative inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
                    disabled={isPending}
                  >
                    {isPending ? "Processing..." : "Reset Password"}
                  </button>
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
                  Back to Login
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
