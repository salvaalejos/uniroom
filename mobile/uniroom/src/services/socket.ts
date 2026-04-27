import io, { Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (userId: string): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    if (socket && socket.connected) {
      resolve(socket);
      return;
    }
    socket = io('http://localhost:3001', {   // <-- puerto 3001
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