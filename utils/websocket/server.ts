import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';

interface WebSocketServerEvents {
  connection: (ws: WebSocket) => void;
}

export class WebSocketServer {
  private wss: WSServer;
  private eventHandlers: Partial<WebSocketServerEvents> = {};

  constructor() {
    this.wss = new WSServer({ noServer: true });

    this.wss.on('connection', (ws: WebSocket) => {
      if (this.eventHandlers.connection) {
        this.eventHandlers.connection(ws);
      }
    });
  }

  on<K extends keyof WebSocketServerEvents>(
    event: K,
    handler: WebSocketServerEvents[K]
  ) {
    this.eventHandlers[event] = handler;
  }

  async handleRequest(req: Request) {
    const upgradeHeader = req.headers.get('upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected Upgrade: WebSocket', { status: 426 });
    }

    // Convert Request to IncomingMessage-like object
    const incomingMessage: Partial<IncomingMessage> = {
      headers: Object.fromEntries(req.headers.entries()),
      method: req.method,
      url: req.url,
    };

    // Create a dummy socket
    const socket = new Socket();

    const { ws, response } = await new Promise<{
      ws: WebSocket;
      response: Response;
    }>((resolve) => {
      this.wss.handleUpgrade(
        incomingMessage as IncomingMessage,
        socket,
        Buffer.alloc(0),
        (ws) => {
          this.wss.emit('connection', ws);
          resolve({
            ws,
            response: new Response(null, { status: 101 }),
          });
        }
      );
    });

    return response;
  }
}

// Extend WebSocket type with event handlers
declare module 'ws' {
  interface WebSocket {
    on(event: 'message', cb: (data: string) => void): void;
    on(event: 'close', cb: () => void): void;
    send(data: string): void;
    readyState: number;
    close(): void;
  }
}

// WebSocket readyState values
export const WebSocketReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;
