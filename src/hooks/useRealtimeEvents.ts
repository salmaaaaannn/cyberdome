'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface RealtimeEventPayload {
  type: string;
  data: any;
  timestamp?: string;
  company_id?: string;
}

export function useRealtimeEvents(onEvent?: (event: RealtimeEventPayload) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEventPayload | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('cyberdome_token');
    if (!token) {
      setIsConnected(false);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/v1/ws';
    const fullUrl = `${wsUrl}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(fullUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed: RealtimeEventPayload = JSON.parse(event.data);
          setLastEvent(parsed);
          if (onEventRef.current) {
            onEventRef.current(parsed);
          }
        } catch {
          // Non-JSON ping/pong or message
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;
        // Schedule auto-reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastEvent,
  };
}
