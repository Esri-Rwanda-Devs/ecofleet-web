import { io, Socket } from 'socket.io-client';

/** Always connect Socket.IO to the Nest backend — never the UI origin. */
const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  'https://esrirw.rw:8000'
).replace(/\/$/, '');

let socket: Socket | null = null;


export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.3,
      timeout: 15000,
      withCredentials: false,
      forceNew: false,
      autoConnect: true,
    });
  }
  return socket;
}

/** Join dispatch + alerts rooms (safe to call on every connect/reconnect). */
export function subscribeDispatchRooms(sock: Socket = getSocket()): void {
  sock.emit('subscribe:dispatch');
  sock.emit('subscribe:alerts');
}

/** Join a trip room (bare + braced forms are handled server-side). */
export function subscribeTripRoom(
  tripId: string,
  sock: Socket = getSocket(),
): void {
  if (!tripId) return;
  sock.emit('subscribe:trip', { tripId });
}
