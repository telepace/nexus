import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ReaderLayout from "@/components/layout/ReaderLayout";
import { ClientContent } from "./ClientContent";

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

// 服务器端获取内容数据
async function getContentData(id: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken")?.value;

    if (!token) {
      throw new Error("No authentication token found");
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    // 并行请求内容详情和markdown内容
    const [contentResponse, markdownResponse] = await Promise.allSettled([
      fetch(`${apiUrl}/api/v1/content/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-cache",
        next: { tags: [`content-${id}`] },
      }),
      fetch(`${apiUrl}/api/v1/content/${id}/markdown`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-cache",
        next: { tags: [`content-markdown-${id}`] },
      }),
    ]);

    let content: ContentDetail | null = null;
    let markdown: string | null = null;

    // 处理内容详情响应
    if (contentResponse.status === "fulfilled" && contentResponse.value.ok) {
      content = await contentResponse.value.json();
    } else if (
      contentResponse.status === "fulfilled" &&
      contentResponse.value.status === 404
    ) {
      notFound();
    }

    // 处理markdown响应
    if (markdownResponse.status === "fulfilled" && markdownResponse.value.ok) {
      const markdownData = await markdownResponse.value.json();
      markdown = markdownData.markdown_content;
    }

    return { content, markdown };
  } catch (error) {
    console.error("Error fetching content:", error);
    // 返回null，让客户端处理
    return { content: null, markdown: null };
  }
}

interface ReaderPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { id } = await params;

  // 服务器端预取数据
  const { content, markdown } = await getContentData(id);

  return (
    <ReaderLayout contentId={id} contentText={content?.title || ""}>
      <ClientContent
        contentId={id}
        initialData={content}
        initialMarkdown={markdown}
      />
    </ReaderLayout>
  );
} 