import { WebSocketMessage } from './types';

type MessageHandler<T = unknown> = (data: T) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30s max
  private baseReconnectDelay = 1000; // 1s initial
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private handlers: Map<string, Set<MessageHandler<any>>> = new Map();
  private isExplicitlyClosed = false;

  constructor(customUrl?: string) {
    const defaultWsUrl =
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';
    this.url = customUrl || defaultWsUrl;
  }

  public connect(tokenOverride?: string): void {
    if (typeof window === 'undefined') return;

    this.isExplicitlyClosed = false;
    this.token =
      tokenOverride ||
      (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);

    if (!this.token) {
      console.warn('[WebSocketClient] Cannot connect: No auth token found.');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = new URL(this.url);
    wsUrl.searchParams.set('token', this.token);

    try {
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = () => {
        console.log('[WebSocketClient] Connected successfully');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.dispatch(message);
        } catch (err) {
          console.error('[WebSocketClient] Failed to parse incoming message:', err);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log(`[WebSocketClient] Closed (code: ${event.code}, reason: ${event.reason})`);
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocketClient] Error encountered:', error);
      };
    } catch (error) {
      console.error('[WebSocketClient] Failed to initialize WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  public on<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return cleanup unsubscriber
    return () => {
      this.off(type, handler);
    };
  }

  public off<T = unknown>(type: string, handler: MessageHandler<T>): void {
    const listeners = this.handlers.get(type);
    if (listeners) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this.handlers.delete(type);
      }
    }
  }

  public send(type: string, payload: unknown = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    } else {
      console.warn('[WebSocketClient] Cannot send message; WebSocket is not open.');
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private dispatch(message: WebSocketMessage): void {
    // Handle internal pong
    if (message.type === 'pong') {
      return;
    }

    const listeners = this.handlers.get(message.type);
    if (listeners) {
      listeners.forEach((handler) => {
        try {
          handler(message.payload);
        } catch (err) {
          console.error(`[WebSocketClient] Handler error for ${message.type}:`, err);
        }
      });
    }

    // Also dispatch to wildcard '*' listeners
    const wildcardListeners = this.handlers.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((handler) => {
        try {
          handler(message);
        } catch (err) {
          console.error('[WebSocketClient] Wildcard handler error:', err);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    console.log(`[WebSocketClient] Scheduling reconnect in ${delay}ms (attempt #${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Global singleton instance for shared connection across pages
export const wsClient = new WebSocketClient();
