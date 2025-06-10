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
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (!enabled || !user?.token || eventSourceRef.current) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const eventSource = new EventSource(
      `${apiUrl}/api/v1/content/events`,
      {
        withCredentials: true,
      }
    );

    eventSource.onopen = () => {
      isConnectedRef.current = true;
      console.log('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ContentEvent = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connection_established':
            onConnectionEstablished?.();
            break;
          case 'content_status_update':
            onContentUpdate?.(data);
            break;
          case 'heartbeat':
            // 心跳，保持连接
            break;
          default:
            console.log('Unknown SSE event type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
        onError?.(error as Error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      isConnectedRef.current = false;
      
      // 关闭当前连接
      eventSource.close();
      eventSourceRef.current = null;
      
      // 尝试重连
      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect SSE...');
          connect();
        }, 3000);
      }
      
      onError?.(new Error('SSE connection failed'));
    };

    eventSourceRef.current = eventSource;
  }, [enabled, user?.token, onContentUpdate, onConnectionEstablished, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
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