"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, Suspense, useEffect } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSearchParams } from "next/navigation";

import { passwordReset } from "@/components/actions/password-reset-action";
import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/submitButton";
import { FormError } from "@/components/ui/FormError";

// SearchParams component to handle useSearchParams hook with Suspense
function SearchParamsHandler({ setEmail }: { setEmail: (email: string) => void }) {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';
  
  // Set email in parent component
  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery, setEmail]);
  
  return null;
}

export default function Page() {
  const [email, setEmail] = useState('');
  const [state, dispatch] = useActionState(passwordReset, undefined);
  
  // Maintain form values when there's an error
  const handleSubmit = (formData: FormData) => {
    // Save current value before submitting
    setEmail(formData.get("email") as string);
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
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">Password Recovery</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Enter your email to receive instructions to reset your password.</p>
        </div>

        <Card className="w-full rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm transition-all duration-300 hover:shadow-blue-100 dark:hover:shadow-blue-900/20">
          <CardContent className="pt-6 px-6">
            <form action={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Email
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
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <SubmitButton 
                  text="Send Reset Link" 
                  className="relative w-full h-11 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 dark:from-slate-50 dark:to-white dark:text-slate-800 transition-all duration-300"
                />
              </div>
              
              {state?.message && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-green-800 dark:text-green-200 text-center">
                  {state.message}
                </div>
              )}
              
              <FormError state={state} className="text-center" />
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <Link
            href={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
            className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
