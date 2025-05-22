import Link from "next/link";
import { Home, Users2, List, MessageSquare } from "lucide-react";
import Image from "next/image";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/components/actions/logout-action";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  currentPath?: string;
}

// 定义主题颜色变量，符合 ui-colors 规则
const themeColors = {
  primary: "#3B82F6", // Primary Blue
  success: "#2EC27E", // Green
  info: "#0284C7", // Info Blue
  warning: "#F59E0B", // Warning
  error: "#DC2626", // Error
  highlight: "#FEF9C3", // Highlight Yellow
};

export default function MainLayout({
  children,
  pageTitle = "Dashboard",
  currentPath = "/dashboard",
}: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      <aside className="fixed inset-y-0 left-0 z-10 w-16 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <div className="flex flex-col items-center gap-8">
          <Link
            href="/"
            className="flex items-center justify-center rounded-full"
          >
            <Image
              src="/images/vinta.png"
              alt="Vinta"
              width={64}
              height={64}
              className="object-cover transition-transform duration-200 hover:scale-105"
            />
          </Link>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-2 ${
                    currentPath === "/dashboard"
                      ? `text-${themeColors.primary}`
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  }`}
                  aria-label="Dashboard"
                >
                  <List className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
              >
                <p>Dashboard</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/customers"
                  className={`flex items-center gap-2 ${
                    currentPath === "/customers"
                      ? `text-${themeColors.primary}`
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  }`}
                  aria-label="Customers"
                >
                  <Users2 className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
              >
                <p>Customers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/prompts"
                  className={`flex items-center gap-2 ${
                    currentPath === "/prompts"
                      ? `text-${themeColors.primary}`
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                  }`}
                  aria-label="Prompt Hub"
                >
                  <span className="flex flex-col items-center">
                    <MessageSquare className="h-5 w-5" />
                    <span className="sr-only">Prompt Hub</span>
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
              >
                <p>Prompt Hub</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>
      <main className="ml-16 w-full p-8 bg-gray-50 dark:bg-gray-900">
        <header className="flex justify-between items-center mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href="/"
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-gray-400 dark:text-gray-600">
                /
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    href={currentPath}
                    className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100"
                  >
                    {currentPath === "/dashboard" && (
                      <List className="h-4 w-4" />
                    )}
                    {currentPath === "/customers" && (
                      <Users2 className="h-4 w-4" />
                    )}
                    {currentPath === "/prompts" && (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    <span>{pageTitle}</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      U
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md"
              >
                <DropdownMenuItem>
                  <Link
                    href="/support"
                    className="block w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Support
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Logout
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <section className="grid gap-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          {children}
        </section>
      </main>
    </div>
  );
}
