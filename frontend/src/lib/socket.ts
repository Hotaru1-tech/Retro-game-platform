import { io, Socket } from 'socket.io-client';
import { WS_URL } from './utils';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    socket = io(WS_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    const token = localStorage.getItem('token');
    s.auth = { token };
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function updateSocketAuth(): void {
  if (socket) {
    const token = localStorage.getItem('token');
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}
