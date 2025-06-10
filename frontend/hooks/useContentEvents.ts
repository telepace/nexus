import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';

export interface ContentEvent {
  id: string;
  timestamp: string;
  type: 'content_status_update' | 'connection_established' | 'heartbeat';
  content_id?: string;
  status?: string;
  title?: string;
  error_message?: string;
  progress?: number;
}

interface UseContentEventsOptions {
  onContentUpdate?: (event: ContentEvent) => void;
  onConnectionEstablished?: () => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

export function useContentEvents(options: UseContentEventsOptions = {}) {
  const { 
    onContentUpdate, 
    onConnectionEstablished, 
    onError, 
    enabled = true 
  } = options;
  
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (!enabled || !user?.token || abortControllerRef.current) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${apiUrl}/api/v1/content/events`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('SSE response body is null');
      }

      isConnectedRef.current = true;
      console.log('SSE connection established');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataContent = line.slice(6); // Remove "data: " prefix
              
              if (dataContent.trim() === '') {
                continue;
              }

              try {
                const eventData: ContentEvent = JSON.parse(dataContent);
                
                switch (eventData.type) {
                  case 'connection_established':
                    onConnectionEstablished?.();
                    break;
                  case 'content_status_update':
                    onContentUpdate?.(eventData);
                    break;
                  case 'heartbeat':
                    // 心跳，保持连接
                    break;
                  default:
                    console.log('Unknown SSE event type:', eventData.type);
                }
              } catch (parseError) {
                console.error('Error parsing SSE message:', parseError);
                onError?.(parseError as Error);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Connection was intentionally aborted
        return;
      }

      console.error('SSE connection error:', error);
      isConnectedRef.current = false;
      
      // 清理当前连接
      abortControllerRef.current = null;
      
      // 尝试重连
      if (enabled && user?.token) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect SSE...');
          connect();
        }, 3000);
      }
      
      onError?.(error as Error);
    }
  }, [enabled, user?.token, onContentUpdate, onConnectionEstablished, onError]);

  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    isConnectedRef.current = false;
  }, []);

  useEffect(() => {
    if (enabled && user?.token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, user?.token, connect, disconnect]);

  return {
    isConnected: isConnectedRef.current,
    connect,
    disconnect,
  };
} 