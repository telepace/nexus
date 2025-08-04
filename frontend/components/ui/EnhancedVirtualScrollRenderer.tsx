"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { AlertCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  SilentLoadingIndicator,
  SilentSkeletonLoader,
  SilentTransition,
  MicroLoadingDot,
} from "./SilentLoadingIndicator";
import { useScrollVelocity } from "@/hooks/useScrollVelocity";
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
import {
  contentApi,
  ContentChunk,
  ContentChunksResponse,
} from "@/lib/api/content";

interface EnhancedVirtualScrollRendererProps {
  contentId: string;
  className?: string;
  chunkSize?: number;
  maxVisibleChunks?: number;
  // Enhanced options
  enableSmartPreloading?: boolean;
  enableNetworkAdaptation?: boolean;
  loadingVariant?: "invisible" | "ghost" | "subtle";
  debugMode?: boolean;
}

interface ChunkCache {
  [page: number]: ContentChunk[];
}

interface PreloadStrategy {
  baseDistance: number;
  velocityMultiplier: number;
  maxDistance: number;
  bufferPages: number;
}

// 防抖函数 - 优化版本
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

// 节流函数 - 优化版本
function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const lastCallRef = useRef<number>(0);
  const lastArgsRef = useRef<unknown[]>([]);

  return useCallback(
    (...args: unknown[]) => {
      const now = Date.now();
      lastArgsRef.current = args;

      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay],
  ) as T;
}

export const EnhancedVirtualScrollRenderer: React.FC<
  EnhancedVirtualScrollRendererProps
> = ({
  contentId,
  className = "",
  chunkSize = 15,
  maxVisibleChunks = 100, // Increased from 50
  enableSmartPreloading = true,
  enableNetworkAdaptation = true,
  loadingVariant = "ghost",
  debugMode = false,
}) => {
  // State management
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [chunkCache, setChunkCache] = useState<ChunkCache>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [preloadQueue, setPreloadQueue] = useState<Set<number>>(new Set());

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const loadTriggerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef<number>(0);
  const lastErrorTimeRef = useRef<number>(0);

  // Enhanced hooks
  const {
    velocityData,
    handleScroll: onScroll,
    isFastScrolling,
    isScrollingDown,
  } = useScrollVelocity({
    threshold: 200, // pixels per second for "fast" scrolling
    sampleWindow: 150,
    debounceDelay: 200,
  });

  const { networkData, getPreloadStrategy, shouldReducePreloading } =
    useNetworkQuality();

  // Calculate dynamic preload strategy
  const preloadStrategy = useMemo((): PreloadStrategy => {
    const networkStrategy = enableNetworkAdaptation
      ? getPreloadStrategy()
      : {
          preloadDistance: 800,
          maxPreloadPages: 3,
          chunkSize: 20,
        };

    let baseDistance = networkStrategy.preloadDistance;
    let velocityMultiplier = 1;
    const maxDistance = networkStrategy.preloadDistance * 2;

    if (enableSmartPreloading) {
      // Adjust based on scroll velocity
      if (isFastScrolling) {
        velocityMultiplier = Math.min(velocityData.velocity / 100, 3); // Max 3x multiplier
        baseDistance = Math.min(baseDistance * velocityMultiplier, 2000);
      }

      // Direction-based adjustments
      if (isScrollingDown) {
        baseDistance *= 1.2; // Increase preload distance when scrolling down
      }
    }

    return {
      baseDistance,
      velocityMultiplier,
      maxDistance,
      bufferPages: networkStrategy.maxPreloadPages,
    };
  }, [
    enableNetworkAdaptation,
    enableSmartPreloading,
    getPreloadStrategy,
    isFastScrolling,
    velocityData.velocity,
    isScrollingDown,
  ]);

  // Optimized chunk rendering
  const renderedChunks = useMemo(() => {
    if (!chunks || !Array.isArray(chunks)) {
      return [];
    }
    return chunks.map((chunk, index) => ({
      ...chunk,
      key: `${chunk.id}-${visibleStartIndex + index}`,
    }));
  }, [chunks, visibleStartIndex]);

  // Enhanced load chunks with error recovery
  const loadChunks = useCallback(
    async (page: number, isPreload = false) => {
      // Prevent duplicate loads
      if (preloadQueue.has(page)) return;

      try {
        // Add to preload queue
        if (isPreload) {
          setPreloadQueue((prev) => new Set(prev.add(page)));
        }

        if (page === 1) {
          setLoading(true);
          setError(null);
          setChunks([]);
          setVisibleStartIndex(0);
          retryCountRef.current = 0;
        } else if (!isPreload) {
          setLoadingMore(true);
        }

        // Check cache first
        if (chunkCache[page]) {
          const cachedChunks = chunkCache[page];
          if (page === 1) {
            setChunks(cachedChunks);
          } else if (!isPreload) {
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
        } else if (!isPreload) {
          setChunks((prev) => [...prev, ...response.chunks]);
        }

        setHasMore(response.pagination?.has_next || false);
        setCurrentPage(page);

        // Reset retry count on success
        retryCountRef.current = 0;
      } catch (err) {
        console.error("Error loading chunks:", err);

        // Enhanced error handling
        const now = Date.now();
        const timeSinceLastError = now - lastErrorTimeRef.current;
        lastErrorTimeRef.current = now;

        // Exponential backoff for retries
        const shouldRetry =
          retryCountRef.current < 3 && timeSinceLastError > 1000;

        if (shouldRetry && !isPreload) {
          retryCountRef.current++;
          setTimeout(() => {
            loadChunks(page, isPreload);
          }, Math.pow(2, retryCountRef.current) * 1000);
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load content",
          );
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);

        // Remove from preload queue
        if (isPreload) {
          setPreloadQueue((prev) => {
            const newSet = new Set(prev);
            newSet.delete(page);
            return newSet;
          });
        }
      }
    },
    [contentId, chunkSize, chunkCache, preloadQueue],
  );

  // Intelligent preloading
  const preloadNextPages = useCallback(
    (currentPage: number) => {
      if (!enableSmartPreloading || shouldReducePreloading) return;

      const pagesToPreload = Math.min(preloadStrategy.bufferPages, 2);

      for (let i = 1; i <= pagesToPreload; i++) {
        const nextPage = currentPage + i;
        if (!chunkCache[nextPage] && !preloadQueue.has(nextPage)) {
          // Use setTimeout to avoid blocking the main thread
          setTimeout(() => {
            loadChunks(nextPage, true);
          }, i * 100); // Stagger preloads
        }
      }
    },
    [
      enableSmartPreloading,
      shouldReducePreloading,
      preloadStrategy.bufferPages,
      chunkCache,
      preloadQueue,
      loadChunks,
    ],
  );

  // Load initial chunks
  useEffect(() => {
    loadChunks(1);
  }, [loadChunks]);

  // Enhanced scroll handling
  const handleScroll = useThrottle((event: Event) => {
    onScroll(event);

    // Trigger preloading based on scroll behavior
    if (enableSmartPreloading && isScrollingDown && !loadingMore) {
      preloadNextPages(currentPage);
    }
  }, 50); // Reduced throttle for better responsiveness

  // Enhanced Intersection Observer for loading
  useEffect(() => {
    if (!loadTriggerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          requestAnimationFrame(() => {
            loadChunks(currentPage + 1);
          });
        }
      },
      {
        rootMargin: `${preloadStrategy.baseDistance}px`, // Dynamic preload distance
        threshold: 0.01, // Reduced threshold for earlier triggering
      },
    );

    observer.observe(loadTriggerRef.current);

    return () => observer.disconnect();
  }, [
    hasMore,
    loadingMore,
    loading,
    currentPage,
    loadChunks,
    preloadStrategy.baseDistance,
  ]);

  // Optimized DOM cleanup with user activity awareness
  const debouncedCleanup = useDebounce(() => {
    // Don't cleanup if user is actively scrolling
    if (velocityData.isScrolling) return;

    if (chunks && chunks.length > maxVisibleChunks) {
      const chunksToRemove = Math.min(
        Math.floor(chunkSize / 2), // Remove fewer chunks at a time
        chunks.length - maxVisibleChunks,
      );
      setChunks((prev) => prev.slice(chunksToRemove));
      setVisibleStartIndex((prev) => prev + chunksToRemove);
    }
  }, 1000); // Increased delay

  useEffect(() => {
    if (!topSentinelRef.current || !chunks || chunks.length <= maxVisibleChunks)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting && !velocityData.isScrolling) {
          debouncedCleanup();
        }
      },
      {
        rootMargin: "800px 0px 0px 0px", // Increased cleanup threshold
        threshold: 0,
      },
    );

    observer.observe(topSentinelRef.current);

    return () => observer.disconnect();
  }, [chunks, debouncedCleanup, maxVisibleChunks, velocityData.isScrolling]);

  const retryLoad = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
    loadChunks(1);
  }, [loadChunks]);

  // Debug information
  const debugInfo = debugMode
    ? {
        velocity: Math.round(velocityData.velocity),
        direction: velocityData.direction,
        networkQuality: networkData.quality,
        preloadDistance: Math.round(preloadStrategy.baseDistance),
        chunksLoaded: chunks.length,
        cacheSize: Object.keys(chunkCache).length,
        preloadQueue: preloadQueue.size,
      }
    : null;

  if (loading && (!chunks || chunks.length === 0)) {
    return <Loading />;
  }

  if (error && (!chunks || chunks.length === 0)) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={retryLoad}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
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
      className={`overflow-auto ${className}`}
      style={{
        height: "100%",
        maxHeight: "100%",
        position: "relative",
        willChange: "scroll-position",
        contain: "layout style paint", // Performance optimization
      }}
      onScroll={handleScroll}
    >
      {/* Debug overlay */}
      {debugInfo && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
          <div>Velocity: {debugInfo.velocity}px/s</div>
          <div>Direction: {debugInfo.direction}</div>
          <div>Network: {debugInfo.networkQuality}</div>
          <div>Preload: {debugInfo.preloadDistance}px</div>
          <div>Chunks: {debugInfo.chunksLoaded}</div>
          <div>Cache: {debugInfo.cacheSize}</div>
          <div>Queue: {debugInfo.preloadQueue}</div>
        </div>
      )}

      {/* Silent loading indicator */}
      <SilentLoadingIndicator
        isLoading={loadingMore}
        variant={loadingVariant}
        position="bottom"
      />

      {/* Top sentinel for DOM cleanup */}
      {visibleStartIndex > 0 && <div ref={topSentinelRef} className="h-1" />}

      {/* Content chunks with transitions */}
      <SilentTransition isLoading={loadingMore}>
        <div className="space-y-0">
          {renderedChunks.map((chunk) => (
            <EnhancedChunkItem key={chunk.key} chunk={chunk} />
          ))}
        </div>
      </SilentTransition>

      {/* Invisible load trigger */}
      {hasMore && (
        <div
          ref={loadTriggerRef}
          className="h-4 flex items-center justify-center"
        >
          {loadingMore && (
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <MicroLoadingDot size="xs" />
              <MicroLoadingDot size="xs" className="opacity-60" />
              <MicroLoadingDot size="xs" className="opacity-40" />
            </div>
          )}
        </div>
      )}

      {/* Skeleton loading for next chunks */}
      {loadingMore && (
        <div className="py-8 px-8">
          <SilentSkeletonLoader lines={2} className="opacity-40" />
        </div>
      )}

      {/* Subtle end indicator */}
      {!hasMore && chunks && chunks.length > 0 && (
        <div className="text-center py-8 text-muted-foreground/60">
          <div className="text-xs opacity-60">
            {totalChunks} chunks •{" "}
            {visibleStartIndex > 0
              ? `${visibleStartIndex + 1}-${visibleStartIndex + chunks.length}`
              : "All content loaded"}
          </div>
        </div>
      )}

      {/* Error recovery for partial failures */}
      {error && chunks && chunks.length > 0 && (
        <div className="text-center py-4 text-destructive/80 bg-destructive/5">
          <div className="text-xs mb-2">Failed to load more content</div>
          <button
            onClick={() => loadChunks(currentPage + 1)}
            className="text-xs px-3 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

// Enhanced chunk component with performance optimizations
const EnhancedChunkItem = React.memo<{
  chunk: ContentChunk & { key: string };
}>(({ chunk }) => (
  <div
    className="chunk-item py-4 px-8 animate-fade-in-up"
    style={{ contain: "layout style" }}
  >
    <div className="chunk-header mb-2 text-xs text-neutral-400 flex justify-between items-center">
      <span className="font-medium">
        Chunk {chunk.index + 1} • {chunk.type}
      </span>
      <span className="text-neutral-400">
        {chunk.word_count} words • {chunk.char_count} chars
      </span>
    </div>
    <div className="chunk-content">
      <MarkdownRenderer
        content={chunk.content}
        className="prose prose-sm max-w-[35rem] dark:prose-invert mx-auto [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
      />
    </div>
  </div>
));

EnhancedChunkItem.displayName = "EnhancedChunkItem";

export default EnhancedVirtualScrollRenderer;
