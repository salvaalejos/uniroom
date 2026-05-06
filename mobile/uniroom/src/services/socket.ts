import io, { Socket } from 'socket.io-client';
import { WS_URL } from '../config';

let socket: Socket | null = null;

export const connectSocket = (userId: string): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket && socket.connected) {
      resolve(socket);
      return;
    }
    socket = io(WS_URL, {
      transports: ['websocket'],
    });
    socket.on('connect', () => {
      console.log('WebSocket conectado');
      socket?.emit('register', userId);
      resolve(socket!);
    });
    socket.on('connect_error', (err) => {
      console.error('WebSocket error:', err);
      reject(err);
    });
  });
};

export const getSocket = () => socket;
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};