import { SetupContent } from "@/components/setup/SetupContent";
import { getAuthState } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export default async function SetupPage() {
  // 检查用户登录状态
  const authState = await getAuthState();

  // 未登录直接跳转到登录页
  if (!authState.isAuthenticated) {
    redirect("/login?redirect=/setup");
  }

  // 如果已登录且已完成设置，重定向到仪表盘
  // 这里可以根据实际情况添加一个检查用户是否已完成设置的逻辑
  if (authState.isAuthenticated && false /* 已完成设置的条件 */) {
    redirect("/dashboard");
  }

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
