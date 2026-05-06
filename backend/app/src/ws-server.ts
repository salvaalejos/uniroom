import { Server } from "socket.io";

const io = new Server(3001, {
  cors: { origin: "*" },
  transports: ["websocket"],
});

const userSockets = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);

  socket.on("register", (userId: string) => {
    userSockets.set(userId, socket.id);
    console.log(`[WS] Usuario registrado: ${userId} -> ${socket.id}`);
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`[WS] Usuario desconectado: ${userId}`);
        break;
      }
    }
  });
});

export function emitToUser(userId: string, event: string, data: any) {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    console.log(`[WS] Emitido ${event} a usuario ${userId}`);
  } else {
    console.log(`[WS] Usuario ${userId} no tiene socket activo`);
  }
}

export function emitToAll(event: string, data: any) {
  io.emit(event, data);
}

console.log("[WS] Servidor WebSocket escuchando en puerto 3001");
