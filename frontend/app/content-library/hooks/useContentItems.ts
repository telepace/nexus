"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, getCookie } from "@/lib/client-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { contentCache } from "@/lib/services/content-cache";
import { navigationState } from "@/lib/services/navigation-state";
import { useContentEvents, ContentEvent } from "@/hooks/useContentEvents";
import { eventBus } from "@/lib/event-bus";
import type { ContentItemPublic } from "../types";

// 简单的防抖
function debounce<T extends (...args: never[]) => void>(
  func: T,
  delay: number,
) {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

interface PrefetchStats {
  total: number;
  cached: number;
  inProgress: boolean;
}

export const useContentItems = () => {
  const [items, setItems] = useState<ContentItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefetchStats, setPrefetchStats] = useState<PrefetchStats>({
    total: 0,
    cached: 0,
    inProgress: false,
  });

  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // 本地 bus 监听新内容创建
  useEffect(() => {
    const handler = (item: ContentItemPublic) => {
      setItems((prev) =>
        prev.some((i) => i.id === item.id) ? prev : [item, ...prev],
      );
      contentCache.clearContentList();
      toast.success(`新内容已添加: ${item.title || "未知内容"}`);
    };
    eventBus.on("contentCreated", handler);
    return () => eventBus.off("contentCreated", handler);
  }, []);

  /** 单个内容预加载 */
  const prefetchContent = useCallback(
    async (item: ContentItemPublic) => {
      if (contentCache.has(`content-detail-${item.id}`)) return;

      try {
        const token = user?.token || getCookie("accessToken");
        if (!token) return;
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        const [detailRes, mdRes] = await Promise.allSettled([
          fetch(`${apiUrl}/api/v1/content/${item.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          fetch(`${apiUrl}/api/v1/content/${item.id}/markdown`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
        ]);

        if (detailRes.status === "fulfilled" && detailRes.value.ok) {
          contentCache.setContentDetail(item.id, await detailRes.value.json());
        }
        if (mdRes.status === "fulfilled" && mdRes.value.ok) {
          const data = await mdRes.value.json();
          contentCache.setMarkdownContent(item.id, data.markdown_content);
        }
      } catch (err) {
        console.debug("Prefetch failed:", err);
      }
    },
    [user],
  );

  /** 批量预加载 */
  const batchPrefetchContent = useCallback(
    async (list: ContentItemPublic[]) => {
      const token = user?.token || getCookie("accessToken");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const toPrefetch = list
        .filter((i) => i.processing_status === "completed")
        .slice(0, 15);
      setPrefetchStats({
        total: toPrefetch.length,
        cached: 0,
        inProgress: true,
      });

      const tasks = toPrefetch.map(async (i) => {
        if (contentCache.has(`content-detail-${i.id}`)) {
          setPrefetchStats((p) => ({ ...p, cached: p.cached + 1 }));
          return;
        }
        try {
          const [detailRes, mdRes] = await Promise.allSettled([
            fetch(`${apiUrl}/api/v1/content/${i.id}`, {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "include",
            }),
            fetch(`${apiUrl}/api/v1/content/${i.id}/markdown`, {
              headers: { Authorization: `Bearer ${token}` },
              credentials: "include",
            }),
          ]);
          if (detailRes.status === "fulfilled" && detailRes.value.ok) {
            contentCache.setContentDetail(i.id, await detailRes.value.json());
          }
          if (mdRes.status === "fulfilled" && mdRes.value.ok) {
            const data = await mdRes.value.json();
            contentCache.setMarkdownContent(i.id, data.markdown_content);
          }
          setPrefetchStats((p) => ({ ...p, cached: p.cached + 1 }));
        } catch {}
      });

      Promise.allSettled(tasks).then(() =>
        setPrefetchStats((p) => ({ ...p, inProgress: false })),
      );
    },
    [user],
  );

  // SSE 更新
  const handleContentUpdate = useCallback((event: ContentEvent) => {
    if (event.type === "content_status_update" && event.content_id) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === event.content_id
            ? {
                ...i,
                processing_status: event.status || i.processing_status,
                title: event.title || i.title,
                updated_at: new Date().toISOString(),
              }
            : i,
        ),
      );
      if (event.status === "completed")
        toast.success(`内容处理完成: ${event.title || "未知内容"}`);
      if (event.status === "failed")
        toast.error(`内容处理失败: ${event.error_message || "未知错误"}`);
    } else if (event.type === "content_created" && event.content_item) {
      const newItem = event.content_item as ContentItemPublic;
      setItems((prev) =>
        prev.some((i) => i.id === newItem.id) ? prev : [newItem, ...prev],
      );
      contentCache.clearContentList();
      toast.success(`新内容已添加: ${newItem.title || "未知内容"}`);
    }
  }, []);

  const handleConnectionEstablished = useCallback(
    () => console.log("SSE connected"),
    [],
  );
  const handleSSEError = useCallback(
    (e: Error) => console.error("SSE error", e),
    [],
  );

  useContentEvents({
    onContentUpdate: handleContentUpdate,
    onConnectionEstablished: handleConnectionEstablished,
    onError: handleSSEError,
    enabled: !!user,
  });

  // 首次加载内容
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);

        const cached = contentCache.getContentList();
        if (cached) {
          setItems(cached);
          setLoading(false);
          setTimeout(() => batchPrefetchContent(cached), 1000);
          return;
        }

        const token = user?.token || getCookie("accessToken");
        if (!token) {
          setError("未找到身份令牌");
          router.push("/login");
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const res = await fetch(`${apiUrl}/api/v1/content/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setItems(data);
        contentCache.setContentList(data);
        setTimeout(() => batchPrefetchContent(data), 500);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [user, authLoading, router, batchPrefetchContent]);

  return {
    authLoading,
    items,
    loading,
    error,
    prefetchContent,
    prefetchStats,
  };
};
