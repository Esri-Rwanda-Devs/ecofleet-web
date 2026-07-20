import { io, Socket } from 'socket.io-client';

// Socket.IO must hit Render directly (Vercel rewrites don't proxy websockets).
// Backend gateway allows all origins (`cors: { origin: '*' }`).
const SOCKET_URL = import.meta.env.PROD
  ? import.meta.env.VITE_SOCKET_URL || 'https://ecofleet-backend-1.onrender.com'
  : import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8000';

let socket: Socket | null = null;

/**
 * Shared Socket.IO connection to the backend realtime gateway (same origin as
 * the REST API). Created lazily, reconnects automatically; the API is open so
 * no auth handshake is needed. Rooms are joined by emitting subscribe:dispatch
 * / subscribe:alerts / subscribe:trip / subscribe:station.
 *
 * Polling is tried first: Render (and free-tier cold starts) often abort a bare
 * WebSocket handshake, which surfaces as "WebSocket is closed before the
 * connection is established". Socket.IO then upgrades to websocket when ready.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 20000,
      withCredentials: false,
    });
  }
  return socket;
}
