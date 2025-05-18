import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fetchItems } from "@/components/actions/items-action";
import { DeleteButton } from "./deleteButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { getAuthState } from "@/lib/server-auth-bridge";
import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// 定义Item类型
interface Item {
  id: string;
  title: string;
  description?: string | null;
  quantity?: number;
  owner_id?: string;
}

// 定义API错误响应类型
interface ApiErrorResponse {
  error?: string | null;
  message?: string;
  meta?: { message?: string } | null;
  status?: number;
}

// Dashboard 顶级页面组件，增加错误边界和Suspense
export default async function DashboardPage() {
  // 获取认证状态
  const authState = await getAuthState();

  // 如果未认证，将在 getAuthState 内部重定向到登录页
  if (!authState.isAuthenticated) {
    return (
      <div className="container py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>认证错误</AlertTitle>
          <AlertDescription>未登录或会话已过期，请登录</AlertDescription>
        </Alert>
        <Button asChild>
          <Link href="/login">去登录</Link>
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>页面加载错误</AlertTitle>
            <AlertDescription>
              加载数据时出现意外错误，请稍后再试或联系管理员
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/dashboard/add-item">添加物品</Link>
          </Button>
        </div>
      }
    >
      <Suspense
        fallback={
          <div className="container py-10">
            <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
            <div className="animate-pulse">
              <div className="rounded-md bg-gray-200 h-8 w-24 mb-4"></div>
              <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
              <div className="rounded-md bg-gray-200 h-4 w-3/4 mb-2"></div>
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </ErrorBoundary>
  );
}

// 实际内容组件，可能会挂起(Suspend)
async function DashboardContent() {
  // 使用唯一ID标识这次渲染，帮助调试
  const renderID = Math.random().toString(36).substring(7);
  console.log(`[dashboard-${renderID}] 开始渲染 Dashboard 内容`);

  try {
    // 获取物品数据
    const itemsResponse = await fetchItems();

    // 处理错误或空结果
    let itemsList: Item[] = [];
    let errorMessage: string | null = null;
    let errorStatus: number | null = null;

    if (Array.isArray(itemsResponse)) {
      itemsList = itemsResponse;
      console.log(
        `[dashboard-${renderID}] 成功获取 ${itemsList.length} 个物品`,
      );
    } else if (itemsResponse && typeof itemsResponse === "object") {
      // 处理可能的错误响应格式
      const errorResponse = itemsResponse as ApiErrorResponse;

      if (errorResponse.error) {
        errorMessage = String(errorResponse.error);
      } else if (errorResponse.message) {
        errorMessage = String(errorResponse.message);
      } else if (errorResponse.meta && errorResponse.meta.message) {
        errorMessage = String(errorResponse.meta.message);
      } else {
        errorMessage = "未知错误";
      }

      errorStatus = errorResponse.status || 500;
      console.error(
        `[dashboard-${renderID}] 获取物品出错:`,
        errorMessage,
        "状态:",
        errorStatus,
      );
    }

    // 当有错误时显示错误信息
    if (errorMessage) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误 {errorStatus}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <Button asChild>
            <Link href="/dashboard/add-item">添加物品</Link>
          </Button>
        </div>
      );
    }

    // 没有错误但也没有数据
    if (itemsList.length === 0) {
      return (
        <div className="container py-10">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
          <div className="bg-muted p-8 text-center rounded-lg mb-6">
            <h2 className="text-xl mb-2">暂无物品</h2>
            <p className="text-muted-foreground mb-4">
              您当前没有任何物品，请添加一个新物品开始使用。
            </p>
            <Button asChild>
              <Link href="/dashboard/add-item">添加物品</Link>
            </Button>
          </div>
        </div>
      );
    }

    // 正常情况：显示物品列表
    console.log(
      `[dashboard-${renderID}] 渲染完成，显示 ${itemsList.length} 个物品`,
    );
    return (
      <div className="container py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button asChild>
            <Link href="/dashboard/add-item">添加物品</Link>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsList.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.description || "No description"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        ⋯
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Link href={`/dashboard/edit/${item.id}`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <DeleteButton itemId={item.id} />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  } catch (error) {
    console.error(`[dashboard-${renderID}] 渲染过程出错:`, error);
    throw error; // 让错误边界处理
  }
}
