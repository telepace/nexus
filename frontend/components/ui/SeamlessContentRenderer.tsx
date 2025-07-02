"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { FixedSizeList as List } from "react-window";
import { contentApi } from "@/lib/api/content";
import type {
  ContentChunk,
  ContentChunksResponse,
} from "@/lib/api/content";
import { ChunkItem } from "./ChunkItem";
import { Loading } from "@/components/ui/loading";

interface SeamlessContentRendererProps {
  contentId: string;
  className?: string;
  initialChunkSize?: number; // Size for first screen load
  itemHeight?: number; // Fixed height for virtual scrolling
  virtualScrollThreshold?: number; // Threshold for using virtual scrolling
}

/**
 * SeamlessContentRenderer provides the best user experience:
 * 1. Fast first screen load with pagination
 * 2. Background prefetch of all content for seamless reading
 * 3. Hybrid rendering: normal scroll for small docs, virtual scroll for large docs
 * 4. Fixed item height to prevent overlapping issues
 */
export const SeamlessContentRenderer: React.FC<SeamlessContentRendererProps> = ({
  contentId,
  className = "",
  initialChunkSize = 15,
  itemHeight = 280, // Increased fixed height to accommodate most content
  virtualScrollThreshold = 50, // Use virtual scrolling for documents with > 50 chunks
}) => {
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullContentLoaded, setIsFullContentLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Determine if we should use virtual scrolling based on document size
  const shouldUseVirtualScroll = useMemo(() => {
    return totalChunks > virtualScrollThreshold;
  }, [totalChunks, virtualScrollThreshold]);

  // Update container height when container ref changes
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height || 600);
      }
    };

    updateHeight();
    
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Load initial chunks for first screen
  const loadInitialChunks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: ContentChunksResponse = await contentApi.getContentChunks(
        contentId,
        1,
        initialChunkSize,
        false // Use pagination for first screen
      );

      setChunks(response.chunks);
      setTotalChunks(response.pagination?.total_chunks || 0);
      setLoadingProgress(Math.min((response.chunks.length / (response.pagination?.total_chunks || 1)) * 100, 90));
      
    } catch (err) {
      console.error("Error loading initial chunks:", err);
      setError(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, [contentId, initialChunkSize]);

  // Load all chunks in background
  const loadAllChunks = useCallback(async () => {
    try {
      const response: ContentChunksResponse = await contentApi.getAllContentChunks(contentId);
      
      // Seamlessly replace with full content
      setChunks(response.chunks);
      setTotalChunks(response.chunks.length);
      setIsFullContentLoaded(true);
      setLoadingProgress(100);
      
      // Hide progress indicator after content is loaded
      setTimeout(() => setLoadingProgress(0), 1500);
      
    } catch (err) {
      console.error("Error loading all chunks:", err);
      // Don't show error if initial load was successful
      setLoadingProgress(0);
    }
  }, [contentId]);

  // Load content on mount
  useEffect(() => {
    const loadContent = async () => {
      // Step 1: Load first screen quickly
      await loadInitialChunks();
      
      // Step 2: Load all content in background
      await loadAllChunks();
    };
    
    loadContent();
  }, [loadInitialChunks, loadAllChunks]);

  // Render each chunk item for virtual scrolling (fixed height)
  const renderVirtualChunkItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chunk = chunks[index];
    if (!chunk) return null;

    return (
      <div style={style}>
        <div className="px-2">
          <ChunkItem chunk={chunk} />
        </div>
      </div>
    );
  }, [chunks]);

  // Retry handler
  const retryLoad = useCallback(() => {
    setError(null);
    loadInitialChunks();
  }, [loadInitialChunks]);

  if (loading && chunks.length === 0) {
    return <Loading />;
  }

  if (error && chunks.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={retryLoad}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
    >
      {/* Subtle progress indicator - only show during background loading */}
      {!isFullContentLoaded && loadingProgress > 0 && loadingProgress < 100 && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-0.5 bg-transparent">
            <div
              className="h-full bg-gradient-to-r from-primary/40 to-primary/60 transition-all duration-500 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {chunks.length > 0 && (
        <>
          {shouldUseVirtualScroll ? (
            // Large documents: Use virtual scrolling with fixed height
            containerHeight > 0 && (
              <List
                ref={listRef}
                height={containerHeight}
                itemCount={chunks.length}
                itemSize={itemHeight} // Fixed height to prevent overlapping
                itemData={chunks}
                overscanCount={5} // More overscan for smoother scrolling
                className="scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent hover:scrollbar-thumb-muted/40 transition-colors"
                style={{
                  outline: 'none', // Remove focus outline
                }}
              >
                {renderVirtualChunkItem}
              </List>
            )
          ) : (
            // Small documents: Use normal scrolling for perfect layout
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent hover:scrollbar-thumb-muted/40 transition-colors">
              <div className="space-y-0">
                {chunks.map((chunk, index) => (
                  <div key={`${chunk.id}-${index}`} className="px-2">
                    <ChunkItem chunk={chunk} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 