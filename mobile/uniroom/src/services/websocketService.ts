import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const SOCKET_URL = hostUri ? `http://${hostUri}:3001` : 'http://localhost:3001';

class WebSocketService {
  private socket: Socket | null = null;

  connect(userId: string, userRole: 'estudiante' | 'anfitrion') {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, { transports: ['websocket'] });
    this.socket.on('connect', () => {
      console.log('WebSocket conectado');
      this.socket?.emit('register', userId);
    });
    this.socket.on('disconnect', () => console.log('WebSocket desconectado'));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) this.socket.emit(event, data);
    else console.warn('Socket no conectado');
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new WebSocketService();