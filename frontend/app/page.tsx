"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaGithub } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

// Component that handles auth redirect with Suspense
/**
 * Component that handles authentication redirects and returns null.
 */
function AuthRedirectHandler() {
  useAuthRedirect(); // Handles redirection if user is already authenticated
  return null;
}

// Main content component
/**
 * Renders the main content page with introductory text and links to setup, prompts, and dashboard.
 */
function HomeContent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="text-center max-w-2xl">
        <h1
          className="text-5xl font-bold text-gray-800 dark:text-white mb-6"
          data-testid="main-heading"
        >
          Welcome to the Next.js & FastAPI Boilerplate
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          A simple and powerful template to get started with full-stack
          development using Next.js and FastAPI.
        </p>

        {/* Link to Setup */}
        <Link href="/setup">
          <Button className="px-8 py-4 text-xl font-semibold rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 focus:ring-4 focus:ring-blue-300">
            开始设置
          </Button>
        </Link>

        {/* Link to Prompts */}
        <Link href="/prompts">
          <Button className="px-8 py-4 text-xl font-semibold rounded-full shadow-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 focus:ring-4 focus:ring-green-300 mt-4">
            探索 Prompt
          </Button>
        </Link>

        {/* Link to Dashboard */}
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          直接进入仪表盘
        </Link>

        {/* GitHub Badge */}
        <div className="mt-6">
          <Badge
            variant="outline"
            className="text-sm flex items-center gap-2 px-3 py-2 rounded-lg border-gray-300 dark:border-gray-700"
          >
            <FaGithub className="w-5 h-5 text-black dark:text-white" />
            <Link
              href="https://github.com/https://github.com/telepace"
              target="_blank"
              className="hover:underline"
            >
              View on GitHub
            </Link>
          </Badge>
        </div>
      </div>
    </main>
  );
}

/**
 * Home component that handles authentication redirection and displays home content.
 */
export default function Home() {
  return (
    <>
      {/* Wrap useSearchParams usage in Suspense */}
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>
      <HomeContent />
    </>
  );
}
