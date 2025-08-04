import { SetupContent } from "@/components/setup/SetupContent";
import { getAuthState } from "@/lib/server-auth";
import { redirect } from "next/navigation";

/**
 * Handles the setup page logic, including user authentication and redirection.
 *
 * This function first checks the user's authentication status. If the user is not authenticated,
 * it redirects them to the login page with a callback URL pointing back to the setup page.
 * If the user is authenticated but has already completed the setup, they are redirected to the content library.
 * Otherwise, the setup page content is rendered for the user to complete their setup.
 */
export default async function SetupPage() {
  // 检查用户登录状态
  const authState = await getAuthState();

  // 未登录直接跳转到登录页
  if (!authState.isAuthenticated) {
    redirect("/login?callbackUrl=/setup"); // Corrected query parameter name
  }

  // 如果已登录且已完成设置，重定向到内容库
  // User is authenticated if we reach here.
  // Now check if setup is complete.
  if (authState.user?.is_setup_complete === true) {
    redirect("/content-library");
  }

  // If user is authenticated AND setup is not complete, they stay on this page.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">设置向导</h1>
        <p className="text-muted-foreground mt-2">
          完成几个简单步骤，开始使用 Nexus
        </p>
      </div>
      <SetupContent />
    </main>
  );
}
