import { io, Socket } from 'socket.io-client';
import { WS_URL } from './utils';
import { getAuthToken } from './auth-runtime';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      auth: { token: null },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export async function connectSocket(): Promise<void> {
  const s = getSocket();
  if (!s.connected) {
    const token = await getAuthToken();
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

export async function updateSocketAuth(): Promise<void> {
  if (socket) {
    const token = await getAuthToken();
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
}
