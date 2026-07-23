import { io, Socket } from 'socket.io-client';

/** Always connect Socket.IO to the Nest backend — never the UI origin. */
const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  'https://esrirw.rw:8000'
).replace(/\/$/, '');

let socket: Socket | null = null;

/**
 * Shared Socket.IO connection to the backend realtime gateway (same host as
 * the REST API). Created lazily, reconnects automatically; the API is open so
 * no auth handshake is needed. Rooms are joined by emitting subscribe:dispatch
 * / subscribe:alerts / subscribe:trip / subscribe:station.
 *
 * Polling is tried first: some hosts abort a bare WebSocket handshake, which
 * surfaces as "WebSocket is closed before the connection is established".
 * Socket.IO then upgrades to websocket when ready.
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
