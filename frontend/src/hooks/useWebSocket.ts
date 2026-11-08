'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient } from '@/lib/websocket';

type HandlersMap = Record<string, (payload: any) => void>;

export const useWebSocket = (handlers?: HandlersMap) => {
  const [connected, setConnected] = useState<boolean>(false);
  const handlersRef = useRef<HandlersMap | undefined>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    // Connect client
    wsClient.connect();

    // Check connection status periodically or on changes
    const interval = setInterval(() => {
      setConnected(wsClient.isConnected());
    }, 1500);

    // Initial check
    setConnected(wsClient.isConnected());

    const cleanups: Array<() => void> = [];

    // Register active handlers
    if (handlers) {
      Object.entries(handlers).forEach(([eventType, handler]) => {
        const cleanup = wsClient.on(eventType, (data) => {
          if (handlersRef.current && handlersRef.current[eventType]) {
            handlersRef.current[eventType](data);
          }
        });
        cleanups.push(cleanup);
      });
    }

    return () => {
      clearInterval(interval);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [handlers]);

  const sendMessage = useCallback((type: string, payload: unknown = {}) => {
    wsClient.send(type, payload);
  }, []);

  return {
    connected,
    sendMessage,
  };
};

export default useWebSocket;
