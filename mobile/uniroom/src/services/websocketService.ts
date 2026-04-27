import { io, Socket } from 'socket.io-client';

// Cambia esta URL por la de tu servidor WebSocket en producción
const SOCKET_URL = 'http://localhost:3000'; // o tu IP:puerto

class WebSocketService {
  private socket: Socket | null = null;

  connect(userId: string, userRole: 'estudiante' | 'anfitrion') {
    if (this.socket?.connected) return;
    this.socket = io(SOCKET_URL, {
      query: { userId, userRole },
      transports: ['websocket'],
    });
    this.socket.on('connect', () => {
      console.log('WebSocket conectado');
    });
    this.socket.on('disconnect', () => {
      console.log('WebSocket desconectado');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket no conectado');
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new WebSocketService();