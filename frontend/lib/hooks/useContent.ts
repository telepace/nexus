import { useQuery } from "@tanstack/react-query";
import { getCookie } from "@/lib/client-auth";

interface ContentDetail {
  id: string;
  type: string;
  title?: string | null;
  summary?: string | null;
  content_text?: string | null;
  processed_content?: string | null;
  source_uri?: string | null;
  user_id: string;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

interface MarkdownResponse {
  markdown_content: string;
}

// 获取内容详情
async function fetchContentDetail(id: string): Promise<ContentDetail> {
  const token = getCookie("accessToken");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const response = await fetch(`${apiUrl}/api/v1/content/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// 获取Markdown内容
async function fetchMarkdownContent(id: string): Promise<string> {
  const token = getCookie("accessToken");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const response = await fetch(`${apiUrl}/api/v1/content/${id}/markdown`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data: MarkdownResponse = await response.json();
  return data.markdown_content;
}

// Hook for content detail
export function useContent(id: string, initialData?: ContentDetail) {
  return useQuery({
    queryKey: ["content", id],
    queryFn: () => fetchContentDetail(id),
    initialData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for markdown content
export function useMarkdownContent(id: string, initialData?: string) {
  return useQuery({
    queryKey: ["content-markdown", id],
    queryFn: () => fetchMarkdownContent(id),
    initialData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for both content and markdown
export function useContentWithMarkdown(
  id: string,
  initialContent?: ContentDetail,
  initialMarkdown?: string,
) {
  const contentQuery = useContent(id, initialContent);
  const markdownQuery = useMarkdownContent(id, initialMarkdown);

  return {
    content: contentQuery.data,
    markdown: markdownQuery.data,
    isLoading: contentQuery.isLoading || markdownQuery.isLoading,
    error: contentQuery.error || markdownQuery.error,
    isError: contentQuery.isError || markdownQuery.isError,
    refetch: () => {
      contentQuery.refetch();
      markdownQuery.refetch();
    },
  };
}
