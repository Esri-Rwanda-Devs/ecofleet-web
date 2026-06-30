import { io, Socket } from 'socket.io-client';
import { TripTrackingState } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function subscribeToDispatch(
  onFleetUpdate: (state: TripTrackingState) => void,
  onFleetAll: (states: TripTrackingState[]) => void
) {
  if (!socket) return;

  socket.emit('subscribe:dispatch');
  socket.on('fleet:update', onFleetUpdate);
  socket.on('fleet:all', onFleetAll);
}

export function unsubscribeFromDispatch() {
  if (!socket) return;
  socket.off('fleet:update');
  socket.off('fleet:all');
}

export function getSocket() {
  return socket;
}
