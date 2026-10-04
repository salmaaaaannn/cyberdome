// @ts-nocheck
// ============================================================
// CYBERDOME — Real-Time WebSocket Hook
// Connects to FastAPI /ws with JWT authentication
// Company-isolated event subscriptions
// ============================================================
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/stores/appStore';

export type WebSocketStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export interface CyberDomeEvent {
  type: string;
  [key: string]: any;
}

type EventHandler = (event: CyberDomeEvent) => void;

const WS_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000')
  : 'ws://localhost:8000';

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;
const HEARTBEAT_INTERVAL = 25000;

export function useWebSocket(handlers?: Record<string, EventHandler>) {
  const { isAuthenticated } = useAppStore();
  const [status, setStatus] = useState<WebSocketStatus>('DISCONNECTED');
  const [lastEvent, setLastEvent] = useState<CyberDomeEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  const cleanup = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close(1000, 'cleanup');
      }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('cyberdome_token');
    if (!token) {
      setStatus('DISCONNECTED');
      return;
    }

    cleanup();
    setStatus('CONNECTING');

    try {
      const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttempts.current = 0;

        // Start heartbeat
        heartbeatTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const data: CyberDomeEvent = JSON.parse(event.data);
          if (data.type === 'pong' || data.type === 'connection_established') return;

          setLastEvent(data);

          // Dispatch to registered handlers
          if (handlersRef.current) {
            const handler = handlersRef.current[data.type];
            if (handler) handler(data);

            // Always call wildcard handler if provided
            const wildcardHandler = handlersRef.current['*'];
            if (wildcardHandler) wildcardHandler(data);
          }
        } catch {
          // Non-JSON message, ignore
        }
      };

      ws.onclose = (event) => {
        cleanup();
        if (event.code === 1008) {
          // Policy violation (invalid token) — don't reconnect
          setStatus('ERROR');
          return;
        }
        setStatus('RECONNECTING');
        const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after this
      };
    } catch {
      setStatus('ERROR');
    }
  }, [cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('DISCONNECTED');
    reconnectAttempts.current = 0;
  }, [cleanup]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      cleanup();
    };
  }, [isAuthenticated, connect, disconnect, cleanup]);

  return { status, lastEvent, send, disconnect, reconnect: connect };
}
