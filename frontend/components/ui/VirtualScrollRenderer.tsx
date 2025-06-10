"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  contentApi,
  ContentChunk,
  ContentChunksResponse,
} from "@/lib/api/content";

interface ProgressiveRendererProps {
  contentId: string;
  className?: string;
  chunkSize?: number; // Number of chunks to load per page
  maxVisibleChunks?: number; // Maximum chunks to keep in DOM
}

interface ChunkCache {
  [page: number]: ContentChunk[];
}

// 防抖函数
function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: unknown[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  ) as T;
}

// 节流函数
function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: unknown[]) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay],
  ) as T;
}

export const VirtualScrollRenderer: React.FC<ProgressiveRendererProps> = ({
  contentId,
  className = "",
  chunkSize = 15,
  maxVisibleChunks = 50,
}) => {
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [chunkCache, setChunkCache] = useState<ChunkCache>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  // const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 暂时注释掉未使用的变量

  // 使用useMemo优化渲染的chunks
  const renderedChunks = useMemo(() => {
    if (!chunks || !Array.isArray(chunks)) {
      return [];
    }
    return chunks.map((chunk, index) => ({
      ...chunk,
      // actualIndex: visibleStartIndex + index, // 暂时注释掉未使用的属性
      key: `${chunk.id}-${visibleStartIndex + index}`,
    }));
  }, [chunks, visibleStartIndex]);

  const loadChunks = useCallback(
    async (page: number) => {
      try {
        if (page === 1) {
          setLoading(true);
          setError(null);
          setChunks([]);
          setVisibleStartIndex(0);
        } else {
          setLoadingMore(true);
        }

        // Check cache first
        if (chunkCache[page]) {
          const cachedChunks = chunkCache[page];
          if (page === 1) {
            setChunks(cachedChunks);
          } else {
            setChunks((prev) => [...prev, ...cachedChunks]);
          }
          setCurrentPage(page);
          setLoading(false);
          setLoadingMore(false);
          return;
        }

        const response: ContentChunksResponse =
          await contentApi.getContentChunks(contentId, page, chunkSize);

        // Update cache
        setChunkCache((prev) => ({
          ...prev,
          [page]: response.chunks,
        }));

        // Update state
        if (page === 1) {
          setChunks(response.chunks);
          setTotalChunks(response.pagination?.total_chunks || 0);
        } else {
          setChunks((prev) => [...prev, ...response.chunks]);
        }

        setHasMore(response.pagination?.has_next || false);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error loading chunks:", err);
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [contentId, chunkSize, chunkCache],
  );

  // Load initial chunks
  useEffect(() => {
    loadChunks(1);
  }, [loadChunks]);

  // 优化的滚动处理
  const handleScroll = useThrottle(() => {
    // const target = e.currentTarget;
    // const scrollTop = target.scrollTop;
    // const scrollHeight = target.scrollHeight;
    // const clientHeight = target.clientHeight;
    // 可以在这里添加滚动相关的逻辑，如果需要的话
  }, 100);

  // Intersection Observer for loading more content
  useEffect(() => {
    if (!loadTriggerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          // 使用requestAnimationFrame延迟加载，避免阻塞滚动
          requestAnimationFrame(() => {
            loadChunks(currentPage + 1);
          });
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before the trigger
        threshold: 0.1,
      },
    );

    observer.observe(loadTriggerRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, currentPage, loadChunks]);

  // Intersection Observer for DOM cleanup - 使用防抖优化
  const debouncedCleanup = useDebounce(() => {
    if (chunks && chunks.length > maxVisibleChunks) {
      const chunksToRemove = Math.min(
        chunkSize,
        chunks.length - maxVisibleChunks,
      );
      setChunks((prev) => prev.slice(chunksToRemove));
      setVisibleStartIndex((prev) => prev + chunksToRemove);
    }
  }, 500);

  useEffect(() => {
    if (!topSentinelRef.current || !chunks || chunks.length <= maxVisibleChunks)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) {
          debouncedCleanup();
        }
      },
      {
        rootMargin: "500px 0px 0px 0px",
        threshold: 0,
      },
    );

    observer.observe(topSentinelRef.current);

    return () => observer.disconnect();
  }, [chunks, debouncedCleanup, maxVisibleChunks]);

  const retryLoad = useCallback(() => {
    setError(null);
    loadChunks(1);
  }, [loadChunks]);

  if (loading && (!chunks || chunks.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-lg">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error && (!chunks || chunks.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={retryLoad}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto border border-gray-200 dark:border-gray-700 ${className}`}
      style={{
        height: "100%",
        maxHeight: "100%",
        position: "relative",
        willChange: "scroll-position", // 优化滚动性能
      }}
      onScroll={handleScroll}
    >
      {/* Top sentinel for DOM cleanup */}
      {visibleStartIndex > 0 && (
        <div ref={topSentinelRef} className="h-1 bg-red-200" />
      )}

      {/* Content chunks - 使用优化的渲染 */}
      <div className="space-y-0">
        {renderedChunks.map((chunk) => (
          <ChunkItem key={chunk.key} chunk={chunk} />
        ))}
      </div>

      {/* Load trigger */}
      {hasMore && (
        <div
          ref={loadTriggerRef}
          className="h-20 flex items-center justify-center bg-yellow-100 dark:bg-yellow-900"
        >
          {loadingMore ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-gray-600">Loading more content...</p>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Scroll down to load more...
            </div>
          )}
        </div>
      )}

      {/* End indicator */}
      {!hasMore && chunks && chunks.length > 0 && (
        <div className="text-center py-8 text-gray-500 bg-green-100 dark:bg-green-900">
          <div className="text-sm">
            End of content • {totalChunks} chunks total
          </div>
          {visibleStartIndex > 0 && (
            <div className="text-xs text-gray-400 mt-2">
              Showing chunks {visibleStartIndex + 1} -{" "}
              {visibleStartIndex + chunks.length} of {totalChunks}
            </div>
          )}
        </div>
      )}

      {/* Error indicator for partial failures */}
      {error && chunks && chunks.length > 0 && (
        <div className="text-center py-4 text-red-500 bg-red-100 dark:bg-red-900">
          <div className="text-sm mb-2">Failed to load more content</div>
          <button
            onClick={() => loadChunks(currentPage + 1)}
            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

// 分离的Chunk组件，使用React.memo优化
const ChunkItem = React.memo<{
  chunk: ContentChunk & { key: string };
}>(({ chunk }) => (
  <div className="chunk-item border-b border-gray-100 dark:border-gray-800 py-6 px-4 bg-white dark:bg-gray-900">
    <div className="chunk-header mb-3 text-xs text-gray-500 flex justify-between items-center">
      <span className="font-medium">
        Chunk {chunk.index + 1} • {chunk.type}
      </span>
      <span className="text-gray-400">
        {chunk.word_count} words • {chunk.char_count} chars
      </span>
    </div>
    <div className="chunk-content">
      <MarkdownRenderer
        content={chunk.content}
        className="prose prose-sm max-w-none dark:prose-invert"
      />
    </div>
  </div>
));

ChunkItem.displayName = "ChunkItem";

export default VirtualScrollRenderer;
