"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // To get token from URL
import { client } from "@/app/openapi-client/index"; // Adjust as per your project
// import { ContentItemPublic } from "@/app/openapi-client/sdk.gen";

// 临时定义缺失的类型
interface ContentItemPublic {
  id: string;
  title: string;
  content?: string;
  content_text?: string; // 添加缺失的属性
  type?: string;
  processing_status?: string;
  source_uri?: string;
  created_at?: string;
  updated_at?: string;
  // 其他必要的属性
} // Adjust as per your project
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"; // Adjust as per your project
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  LockIcon, 
  EyeIcon, 
  FileText, 
  Calendar,
  ExternalLink 
} from "lucide-react";
import Link from "next/link"; // For a link back to homepage or login

const SharedContentPage = () => {
  const params = useParams();
  const token = params?.token as string | undefined;

  const [contentItem, setContentItem] = useState<ContentItemPublic | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchSharedContent = async (accessPassword?: string) => {
      if (!token) {
        setError("Share token is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setPasswordRequired(false); // Reset password requirement

      try {
        // Note: The actual client method name might differ based on your OpenAPI spec and generator.
        // It expects `token` as path param and `password` as query param.
        // 临时使用 any 类型避免类型错误
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (client as any).getSharedContent(token, {
          password: accessPassword,
        });
        setContentItem(response); // Assuming response is ContentItemPublic
      } catch (error: unknown) {
        console.error("Failed to fetch shared content:", error);
        const handleError = (error: Error | unknown) => {
          const status = (error as { status?: number }).status;
          // 移除未使用的 response 变量
          const responseObj = (error as { response?: { status?: number } })
            .response;
          const data = (error as { data?: { detail?: string } }).data;
          const message = (error as { message?: string }).message;
          return { status, responseObj, data, message };
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { status, responseObj: _, data, message } = handleError(error);
        const errorDetail =
          data?.detail || message || "Failed to load shared content.";

        if (status === 401 && errorDetail === "Password required") {
          setPasswordRequired(true);
          setError(null); // Clear previous errors, show password form
        } else if (status === 403 && errorDetail === "Incorrect password") {
          setPasswordRequired(true);
          setError("Incorrect password. Please try again.");
        } else if (status === 404) {
          setError("Share link not found, expired, or access limit reached.");
        } else {
          setError(errorDetail);
        }
        setContentItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (token && !passwordRequired) {
      // Only fetch if token exists and password is not currently required
      fetchSharedContent();
    } else if (!token) {
      setError("Share token is missing in URL.");
      setIsLoading(false);
    }
  }, [token, passwordRequired]); // Effect will re-run if token changes or if passwordRequired is reset

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password) {
      setError("Password cannot be empty.");
      return;
    }
    setPasswordRequired(false); // Tentatively hide password form
    setIsLoading(true);

    // Re-fetch with password
    try {
      // 临时使用 any 类型避免类型错误
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (client as any).getSharedContent(token, {
        password,
      });
      setContentItem(response);
      setError(null); // Clear password error if successful
    } catch (err: unknown) {
      console.error("Failed to fetch shared content with password:", err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errObj = err as any;
      const status = errObj.status || errObj.response?.status;
      const errorDetail =
        errObj.data?.detail ||
        errObj.message ||
        "Failed to load shared content.";

      setPasswordRequired(true); // Show password form again on error
      if (status === 403 && errorDetail === "Incorrect password") {
        setError("Incorrect password. Please try again.");
      } else if (status === 404) {
        setError("Share link not found, expired, or access limit reached.");
      } else {
        setError(errorDetail);
      }
      setContentItem(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">
          Loading shared content...
        </p>
      </div>
    );
  }

  if (error && !passwordRequired) {
    // If there's an error and it's not just asking for a password
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Accessing Content</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button asChild className="mt-6">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <LockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Password Required
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              This content is password protected. Please enter the password to
              view.
            </p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password">Password</label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon
                    className={`h-5 w-5 ${showPassword ? "text-primary" : ""}`}
                  />
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Unlocking..." : "Unlock Content"}
            </Button>
          </form>
          <Button variant="link" asChild className="mt-4">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!contentItem) {
    // This case should ideally be covered by error handling, but as a fallback:
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Content not available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {contentItem.title || "Untitled Content"}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {contentItem.type && (
                  <Badge variant="outline" className="capitalize">
                    <FileText className="h-3 w-3 mr-1" />
                    {contentItem.type}
                  </Badge>
                )}
                {contentItem.processing_status && (
                  <Badge 
                    variant={contentItem.processing_status === "completed" ? "default" : "secondary"}
                  >
                    {contentItem.processing_status}
                  </Badge>
                )}
                {contentItem.created_at && (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(contentItem.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {contentItem.source_uri && (
                <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  <a 
                    href={contentItem.source_uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate max-w-md"
                  >
                    {contentItem.source_uri}
                  </a>
                </div>
              )}
            </div>
            
            <Button variant="outline" asChild size="sm">
              <Link href="/">
                回到首页
              </Link>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-6">
            {contentItem.content_text ? (
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <MarkdownRenderer content={contentItem.content_text} />
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No content available for this item.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Separator className="mb-6" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This content was shared via Nexus
          </p>
          <Button variant="outline" asChild>
            <Link href="/">
              Explore Nexus
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedContentPage;
