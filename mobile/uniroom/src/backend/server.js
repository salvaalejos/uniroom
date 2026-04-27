const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenamiento en memoria (en producción usa base de datos)
const solicitudes = new Map();
let solicitudIdCounter = 1;

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('solicitar_cita', (data) => {
    const { propiedadId, propiedadTitulo, anfitrionId, estudianteId, fecha, mensaje } = data;
    const solicitudId = `${solicitudIdCounter++}`;
    solicitudes.set(solicitudId, { ...data, id: solicitudId, estado: 'pendiente' });
    
    // Notificar al anfitrión (sabemos su socketId si está conectado)
    // En producción, debes tener un mapa de userId -> socketId
    io.emit('solicitud_cita', {
      id: solicitudId,
      propiedadId,
      propiedadTitulo,
      estudianteId,
      estudianteNombre: `Estudiante ${estudianteId}`,
      fecha,
      mensaje
    });
    
    // También guardar notificación en DB (opcional)
    console.log('Solicitud de cita:', solicitudId);
  });

  socket.on('respuesta_solicitud', (data) => {
    const { solicitudId, aceptada, motivo, estudianteId, propiedadId, fecha } = data;
    const solicitud = solicitudes.get(solicitudId);
    if (solicitud) {
      solicitud.estado = aceptada ? 'aceptada' : 'rechazada';
      // Notificar al estudiante
      io.emit('respuesta_cita', {
        id: solicitudId,
        aceptada,
        motivo,
        estudianteId,
        propiedadId,
        propiedadTitulo: solicitud.propiedadTitulo,
        anfitrionNombre: 'Anfitrión',
        fecha: solicitud.fecha,
      });
      console.log(`Respuesta a solicitud ${solicitudId}: ${aceptada ? 'Aceptada' : 'Rechazada'}`);
    }
  });

  socket.on('reagendar_cita', (data) => {
    const { solicitudId, nuevaFecha, estudianteId } = data;
    const solicitud = solicitudes.get(solicitudId);
    if (solicitud) {
      solicitud.fecha = nuevaFecha;
      solicitud.estado = 'reagendada';
      // Notificar al estudiante la nueva propuesta
      io.emit('respuesta_cita', {
        id: solicitudId,
        aceptada: true,
        motivo: '',
        estudianteId,
        propiedadId: solicitud.propiedadId,
        propiedadTitulo: solicitud.propiedadTitulo,
        anfitrionNombre: 'Anfitrión',
        fecha: nuevaFecha,
      });
      console.log(`Cita reagendada para solicitud ${solicitudId} a la fecha ${nuevaFecha}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

server.listen(3000, () => {
  console.log('Servidor WebSocket escuchando en http://localhost:3000');
});