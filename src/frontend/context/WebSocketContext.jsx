import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const WebSocketContext = createContext(null);

const COLORS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#e11d48', '#4f46e5', '#ca8a04'];

export function WebSocketProvider({ children }) {
  const { currentUser } = useAuth();
  const [onlineCount, setOnlineCount] = useState(1);
  const [cursors, setCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);
  const lastSentRef = useRef(0);

  const colorRef = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const sessionIdRef = useRef(Math.random().toString(36).substring(2, 9));

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established.');
      setIsConnected(true);
      window.dispatchEvent(new CustomEvent('resync-data'));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ONLINE_COUNT') {
          setOnlineCount(data.count);
        } else if (data.type === 'MOUSE_MOVE') {
          const { sessionId, x, y, username, color, timestamp } = data;
          if (sessionId && sessionId !== sessionIdRef.current) {
            setCursors((prev) => ({
              ...prev,
              [sessionId]: {
                x,
                y,
                username,
                color: color || '#2563eb',
                timestamp: timestamp || Date.now(),
              },
            }));
          }
        }

        // Notify subscribers
        listenersRef.current.forEach((listener) => {
          try {
            listener(data);
          } catch (err) {
            console.error('Error in WS subscriber:', err);
          }
        });
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed, retrying in 3 seconds...');
      setIsConnected(false);
      wsRef.current = null;
      setCursors({});
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }, []);

  const addWsListener = useCallback((callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const sendWsMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  // Throttled sendCursorPosition (50ms interval)
  const sendCursorPosition = useCallback((x, y) => {
    if (!currentUser) return;
    const now = Date.now();
    if (now - lastSentRef.current >= 50) {
      lastSentRef.current = now;
      sendWsMessage({
        type: 'MOUSE_MOVE',
        sessionId: sessionIdRef.current,
        username: currentUser.username,
        color: colorRef.current,
        x,
        y,
        timestamp: now,
      });
    }
  }, [currentUser, sendWsMessage]);

  useEffect(() => {
    connect();

    const handleFocus = () => {
      window.dispatchEvent(new CustomEvent('resync-data'));
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    };

    const handleOnline = () => {
      window.dispatchEvent(new CustomEvent('resync-data'));
      connect();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Periodically clean up remote cursors inactive for > 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [sid, cursor] of Object.entries(prev)) {
          if (now - cursor.timestamp > 4000) {
            delete next[sid];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        onlineCount,
        cursors,
        isConnected,
        addWsListener,
        sendWsMessage,
        sendCursorPosition,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
