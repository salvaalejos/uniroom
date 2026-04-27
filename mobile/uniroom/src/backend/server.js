const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const userSockets = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
    console.log(`Usuario ${userId} registrado con socket ${socket.id}`);
  });

  // Recibir solicitud desde el API (no desde el cliente directamente)
  socket.on('solicitud_cita', (data) => {
    const { anfitrionId, ...resto } = data;
    const anfitrionSocket = userSockets.get(anfitrionId);
    if (anfitrionSocket) {
      io.to(anfitrionSocket).emit('solicitud_cita', resto);
    } else {
      console.log(`Anfitrión ${anfitrionId} no conectado`);
    }
  });

  socket.on('respuesta_cita', (data) => {
    const { estudianteId, ...resto } = data;
    const estudianteSocket = userSockets.get(estudianteId);
    if (estudianteSocket) {
      io.to(estudianteSocket).emit('respuesta_cita', resto);
    } else {
      console.log(`Estudiante ${estudianteId} no conectado`);
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, sockId] of userSockets.entries()) {
      if (sockId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log('Usuario desconectado:', socket.id);
  });
});

const WS_PORT = process.env.WS_PORT || 3001;
server.listen(WS_PORT, () => {
  console.log(`Servidor WebSocket en http://localhost:${WS_PORT}`);
});