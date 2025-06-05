"use client";

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
import { AlertCircle, Share2, Settings2 } from "lucide-react"; // Added Share2, Settings2
import { useAuth } from "@/lib/client-auth"; // 改用客户端认证
import { Suspense, useState, useEffect } from "react"; // Added useState
import { ErrorBoundary } from "@/components/ui/error-boundary";

// 导入客户端组件
import { TokenDebugTool } from "./TokenDebugTool";
import { ShareContentModal } from "@/components/share/ShareContentModal"; // Added
import { ManageShareLinks } from "@/components/share/ManageShareLinks"; // Added
import { ContentItemPublic } from "@/app/openapi-client/index";

// 定义API错误响应类型
interface ApiErrorResponse {
  error?: string | null;
  message?: string;
  meta?: { message?: string } | null;
  status?: number;
}

// Dashboard 顶级页面组件，现在是客户端组件
export default function DashboardPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemToShare, setSelectedItemToShare] = useState<ContentItemPublic | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showManageShares, setShowManageShares] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // 生成唯一的渲染ID用于调试
  const renderID = useState(() => Math.random().toString(36).substring(7))[0];

  if (isLoadingAuth) {
    return (
      <div className="container py-10">
        <div className="animate-pulse">
          <div className="rounded-md bg-gray-200 h-8 w-32 mb-6"></div>
          <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
          <div className="rounded-md bg-gray-200 h-4 w-full mb-2"></div>
          <div className="rounded-md bg-gray-200 h-4 w-3/4 mb-2"></div>
        </div>
      </div>
    );
  }

  // 如果未认证，显示错误提示
  if (!user) {
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

  useEffect(() => {
    console.log(`[dashboard-${renderID}] 组件挂载/更新，用户:`, user?.id);

    if (user?.id) {
      setCurrentUserId(user.id);
    }

    async function loadData() {
      setIsLoading(true);
      console.log(`[dashboard-${renderID}] 开始获取数据`);
      try {
        const itemsResponse = await fetchItems();
        if (Array.isArray(itemsResponse)) {
          setItems(itemsResponse);
          console.log(
            `[dashboard-${renderID}] 成功获取 ${itemsResponse.length} 个物品`,
          );
        } else if (itemsResponse && typeof itemsResponse === "object") {
          const errorResponse = itemsResponse as ApiErrorResponse;
          let errorMessage = "未知错误";
          if (errorResponse.error) errorMessage = String(errorResponse.error);
          else if (errorResponse.message)
            errorMessage = String(errorResponse.message);
          else if (errorResponse.meta && errorResponse.meta.message)
            errorMessage = String(errorResponse.meta.message);
          setError(errorMessage);
          console.error(
            `[dashboard-${renderID}] 获取物品出错:`,
            errorMessage,
            "状态:",
            errorResponse.status,
          );
        } else {
          setError("获取物品数据失败");
        }
      } catch (e: unknown) {
        console.error(`[dashboard-${renderID}] 获取数据过程出错:`, e);
        setError(String(e));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [renderID, user]); // 添加user作为依赖

  const openShareModal = (item: ContentItemPublic) => {
    setSelectedItemToShare(item);
    setIsShareModalOpen(true);
  };

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
// Convert to client component to use hooks like useState
// 此函数已被重构，保留作为参考
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function DashboardContentOriginal() {
  // Renamed to avoid conflict, will call this from new wrapper
  // 使用唯一ID标识这次渲染，帮助调试
  const renderID = Math.random().toString(36).substring(7);
  console.log(`[dashboard-${renderID}] 开始渲染 Dashboard 内容`);

  try {
    // 获取物品数据
    const itemsResponse = await fetchItems();

    // 处理错误或空结果
    let itemsList: ContentItemPublic[] = [];
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

        {/* 添加Token调试工具，仅在开发环境中显示 */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded-md">
            <h3 className="text-sm font-semibold mb-2">调试工具</h3>
            <TokenDebugTool />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsList.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.title || "Untitled"}</TableCell>
                <TableCell>{item.summary || "No summary"}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell>{item.processing_status}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        ⋯
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/edit/${item.id}`}
                          className="flex items-center"
                        >
                          <Settings2 className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          // 暂时注释掉未定义的函数调用，后续需要实现
                          // openShareModal(item as ContentItemPublic)
                          console.log("Share modal for", item.id)
                        }
                        className="flex items-center"
                      >
                        <Share2 className="mr-2 h-4 w-4" /> Share
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

        {/* Section to display ManageShareLinks */}
        {/* 暂时注释掉未定义的变量，后续需要实现 */}
        {/* {showManageShares && <ManageShareLinks userId={currentUserId} />} */}
      </div>
    );
  } catch (error) {
    console.error(`[dashboard-${renderID}] 渲染过程出错:`, error);
    throw error; // 让错误边界处理
  }
}

// New wrapper component to handle state and async data fetching
function DashboardContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemToShare, setSelectedItemToShare] = useState<ContentItemPublic | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showManageShares, setShowManageShares] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // 生成唯一的渲染ID用于调试
  const renderID = useState(() => Math.random().toString(36).substring(7))[0];

  useEffect(() => {
    console.log(`[dashboard-${renderID}] 组件挂载/更新，用户:`, user?.id);

    if (user?.id) {
      setCurrentUserId(user.id);
    }

    async function loadData() {
      setIsLoading(true);
      console.log(`[dashboard-${renderID}] 开始获取数据`);
      try {
        const itemsResponse = await fetchItems();
        if (Array.isArray(itemsResponse)) {
          setItems(itemsResponse);
          console.log(
            `[dashboard-${renderID}] 成功获取 ${itemsResponse.length} 个物品`,
          );
        } else if (itemsResponse && typeof itemsResponse === "object") {
          const errorResponse = itemsResponse as ApiErrorResponse;
          let errorMessage = "未知错误";
          if (errorResponse.error) errorMessage = String(errorResponse.error);
          else if (errorResponse.message)
            errorMessage = String(errorResponse.message);
          else if (errorResponse.meta && errorResponse.meta.message)
            errorMessage = String(errorResponse.meta.message);
          setError(errorMessage);
          console.error(
            `[dashboard-${renderID}] 获取物品出错:`,
            errorMessage,
            "状态:",
            errorResponse.status,
          );
        } else {
          setError("获取物品数据失败");
        }
      } catch (e: unknown) {
        console.error(`[dashboard-${renderID}] 获取数据过程出错:`, e);
        setError(String(e));
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [renderID, user]); // 添加user作为依赖

  const openShareModal = (item: ContentItemPublic) => {
    setSelectedItemToShare(item);
    setIsShareModalOpen(true);
  };

  // 暂时未使用的函数，后续实现点击内容项的逻辑
  // const handleItemClick = (item: ContentItem) => {
  //   console.log("Clicked item:", item);
  //   // 可以在这里打开详情页面或执行其他操作
  // };

  // const handleError = (error: Error | unknown) => {
  //   console.error("Error occurred:", error);
  // };

  if (isLoading && items.length === 0) {
    // Show fuller loading state if items are not yet loaded
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <p>Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (items.length === 0 && !isLoading) {
    // Check isLoading to prevent flash of "No items"
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="bg-muted p-8 text-center rounded-lg mb-6">
          <h2 className="text-xl mb-2">No Items Yet</h2>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have any content yet. Add one to get started.
          </p>
          <Button asChild>
            <Link href="/dashboard/add-item">Add Item</Link>
          </Button>
        </div>
        <div className="mt-8">
          <Button onClick={() => setShowManageShares((prev) => !prev)}>
            {showManageShares ? "Hide Share Links" : "Manage Share Links"}
          </Button>
          {showManageShares && (
            <div className="mt-4">
              <ManageShareLinks userId={currentUserId} />
            </div>
          )}
        </div>
        <ShareContentModal
          open={isShareModalOpen}
          onOpenChange={setIsShareModalOpen}
          contentItem={selectedItemToShare}
        />
      </div>
    );
  }

  // Copied from original DashboardContent, now using state `items`
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div>
          <Button
            onClick={() => setShowManageShares((prev) => !prev)}
            variant="outline"
            className="mr-4"
          >
            {showManageShares ? "Hide Shares" : "Manage Shares"}
          </Button>
          <Button asChild>
            <Link href="/dashboard/add-item">Add Item</Link>
          </Button>
        </div>
      </div>

      {process.env.NODE_ENV === "development" && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded-md">
          <h3 className="text-sm font-semibold mb-2">Debug Tools</h3>
          <TokenDebugTool />
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Summary</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.title || "Untitled"}</TableCell>
              <TableCell>{item.summary || "No summary"}</TableCell>
              <TableCell>{item.type}</TableCell>
              <TableCell>{item.processing_status}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      ⋯
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/dashboard/edit/${item.id}`}
                        className="flex items-center"
                      >
                        <Settings2 className="mr-2 h-4 w-4" /> Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openShareModal(item)}
                      className="flex items-center cursor-pointer"
                    >
                      <Share2 className="mr-2 h-4 w-4" /> Share
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

      {showManageShares && (
        <div className="mt-8">
          <ManageShareLinks userId={currentUserId} />
        </div>
      )}

      <ShareContentModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        contentItem={selectedItemToShare}
      />
    </div>
  );
}
