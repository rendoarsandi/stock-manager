import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const WebSocketContext = createContext(null);

const COLORS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#e11d48', '#4f46e5', '#ca8a04'];

export function WebSocketProvider({ children }) {
  const { currentUser } = useAuth();
  const [onlineCount, setOnlineCount] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const listenersRef = useRef(new Set());
  const reconnectTimeoutRef = useRef(null);

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

  // Dummy sendCursorPosition (No-op as cursor tracking is disabled)
  const sendCursorPosition = useCallback(() => {}, []);

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

  // Static empty cursors to maintain compatibility
  const cursors = {};

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
