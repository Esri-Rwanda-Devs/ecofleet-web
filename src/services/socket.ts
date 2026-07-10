import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

let socket: Socket | null = null;

/**
 * Shared Socket.IO connection to the backend realtime gateway (same origin as
 * the REST API). Created lazily, reconnects automatically; the API is open so
 * no auth handshake is needed. Rooms are joined by emitting subscribe:dispatch
 * / subscribe:alerts / subscribe:trip / subscribe:station.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}
