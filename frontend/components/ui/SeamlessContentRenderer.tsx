"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { VariableSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { contentApi } from "@/lib/api/content";
import type {
  ContentChunk,
  ContentChunksResponse,
} from "@/lib/api/content";
import { ChunkItem } from "./ChunkItem";
import { Loading } from "@/components/ui/loading";
import { TextSelectionFloater } from "@/components/ui/text-selection-floater";

interface SeamlessContentRendererProps {
  contentId: string;
  className?: string;
  initialChunkSize?: number;
  itemHeight?: number;
  virtualScrollThreshold?: number;
  enableTextSelection?: boolean;
  onTextAction?: (action: { id: string; label: string; prompt: string }, selectedText: string) => void;
}

export const SeamlessContentRenderer: React.FC<SeamlessContentRendererProps> = ({
  contentId,
  className = "",
  initialChunkSize = 15,
  itemHeight = 400,
  virtualScrollThreshold = 50,
  enableTextSelection = false,
  onTextAction,
}) => {
  const [chunks, setChunks] = useState<ContentChunk[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullContentLoaded, setIsFullContentLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [chunkHeights, setChunkHeights] = useState<Record<number, number>>({});
  const listRef = useRef<List>(null);

  const shouldUseVirtualScroll = useMemo(() => {
    return totalChunks > virtualScrollThreshold;
  }, [totalChunks, virtualScrollThreshold]);

  const updateItemHeight = useCallback((index: number, height: number) => {
    setChunkHeights(prev => {
      if (prev[index] !== height) {
        const newHeights = { ...prev };
        newHeights[index] = height;
        return newHeights;
      }
      return prev;
    });
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  const getItemSize = (index: number) => chunkHeights[index] || itemHeight;

  const loadInitialChunks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ContentChunksResponse = await contentApi.getContentChunks(
        contentId, 1, initialChunkSize, false
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

  const loadAllChunks = useCallback(async () => {
    try {
      const response: ContentChunksResponse = await contentApi.getAllContentChunks(contentId);
      setChunks(response.chunks);
      setTotalChunks(response.chunks.length);
      setIsFullContentLoaded(true);
      setLoadingProgress(100);
      setTimeout(() => setLoadingProgress(0), 1500);
    } catch (err) {
      console.error("Error loading all chunks:", err);
      setLoadingProgress(0);
    }
  }, [contentId]);

  useEffect(() => {
    const loadContent = async () => {
      await loadInitialChunks();
      await loadAllChunks();
    };
    loadContent();
  }, [loadInitialChunks, loadAllChunks]);

  const renderVirtualChunkItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chunk = chunks[index];
    if (!chunk) return null;

    return (
      <div style={style}>
        <div
          ref={el => {
            if (el) {
              const resizeObserver = new ResizeObserver(() => {
                updateItemHeight(index, el.offsetHeight);
              });
              resizeObserver.observe(el);
              // This is a simplified cleanup. A more robust solution might be needed.
              // For now, this works for the component's lifecycle.
            }
          }}
        >
          <ChunkItem chunk={chunk} />
        </div>
      </div>
    );
  }, [chunks, updateItemHeight]);

  const retryLoad = useCallback(() => {
    setError(null);
    loadInitialChunks();
  }, [loadInitialChunks]);

  if (loading && chunks.length === 0) return <Loading />;
  if (error && chunks.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={retryLoad} className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex flex-col content-area ${className}`}>
      {!isFullContentLoaded && loadingProgress > 0 && loadingProgress < 100 && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="h-0.5 bg-transparent">
            <div className="h-full bg-gradient-to-r from-primary/40 to-primary/60" style={{ width: `${loadingProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex-1 w-full">
        {chunks.length > 0 && (
          shouldUseVirtualScroll ? (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  ref={listRef}
                  height={height}
                  width={width}
                  itemCount={chunks.length}
                  itemSize={getItemSize}
                  className="scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent hover:scrollbar-thumb-muted/40"
                >
                  {renderVirtualChunkItem}
                </List>
              )}
            </AutoSizer>
          ) : (
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted/20 scrollbar-track-transparent hover:scrollbar-thumb-muted/40">
              <div className="space-y-0">
                {chunks.map((chunk, index) => (
                  <div key={`${chunk.id}-${index}`}><ChunkItem chunk={chunk} /></div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
      
      {enableTextSelection && (
        <TextSelectionFloater
          enabled={true}
          containerSelector=".content-area"
          onAction={onTextAction}
          zIndex={1050}
        />
      )}
    </div>
  );
}; 