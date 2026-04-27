import { Elysia, t } from "elysia";
import { db } from "../db";
import jwt from "@elysiajs/jwt";
import { io as socketClient } from "socket.io-client";

const WS_URL = process.env.WS_URL || "http://localhost:3001";
let wsClient: any = null;

function getWsClient() {
  if (!wsClient) {
    wsClient = socketClient(WS_URL, { transports: ["websocket"] });
    wsClient.on("connect", () => console.log("API conectada al WS server"));
  }
  return wsClient;
}

export const citasRoutes = new Elysia({ prefix: "/citas" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .derive(async ({ jwt, headers: { authorization }, set }) => {
    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      throw new Error("No autorizado");
    }
    const token = authorization.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || !payload.sub) {
      set.status = 401;
      throw new Error("Token inválido");
    }
    const user = await db.usuario.findUnique({
      where: { id_usuario: payload.sub as string },
    });
    if (!user) {
      set.status = 401;
      throw new Error("Usuario no encontrado");
    }
    return { user };
  })
  // 1. Solicitar cita (estudiante)
  .post(
    "/solicitar",
    async ({ body, user, set }) => {
      if (user.rol !== "ESTUDIANTE") {
        set.status = 403;
        return { error: "Solo estudiantes pueden solicitar citas" };
      }
      const { id_inmueble, fecha_hora } = body;
      const inmueble = await db.inmueble.findUnique({
        where: { id_inmueble },
        include: { arrendador: true },
      });
      if (!inmueble) {
        set.status = 404;
        return { error: "Propiedad no encontrada" };
      }
      const fecha = new Date(fecha_hora);
      if (isNaN(fecha.getTime()) || fecha <= new Date()) {
        set.status = 400;
        return { error: "Fecha inválida (debe ser futura)" };
      }
      const nuevaCita = await db.cita.create({
        data: {
          fecha_hora: fecha,
          estado: "PENDIENTE",
          id_inmueble: inmueble.id_inmueble,
          id_estudiante: user.id_usuario,
          id_anfitrion: inmueble.id_arrendador,
        },
        include: {
          inmueble: { select: { titulo: true } },
          estudiante: { select: { nombre: true, apellidos: true } },
          anfitrion: { select: { nombre: true, apellidos: true } },
        },
      });
      // Notificar al anfitrión vía WebSocket
      const ws = getWsClient();
      ws.emit("solicitud_cita", {
        id: nuevaCita.id_cita,
        propiedadId: nuevaCita.id_inmueble,
        propiedadTitulo: nuevaCita.inmueble.titulo,
        estudianteId: nuevaCita.id_estudiante,
        estudianteNombre: `${nuevaCita.estudiante.nombre} ${nuevaCita.estudiante.apellidos}`,
        anfitrionId: nuevaCita.id_anfitrion,
        fecha: nuevaCita.fecha_hora.toISOString(),
        mensaje: `Solicitud de visita para ${nuevaCita.inmueble.titulo} el ${nuevaCita.fecha_hora.toLocaleString()}`,
      });
      set.status = 201;
      return nuevaCita;
    },
    {
      body: t.Object({
        id_inmueble: t.Number(),
        fecha_hora: t.String(),
      }),
    }
  )
  // 2. Obtener mis citas
  .get("/mis-citas", async ({ user }) => {
    if (user.rol === "ESTUDIANTE") {
      return await db.cita.findMany({
        where: { id_estudiante: user.id_usuario },
        include: {
          inmueble: true,
          anfitrion: { select: { nombre: true, apellidos: true, numero_contacto: true } },
        },
        orderBy: { fecha_hora: "asc" },
      });
    } else {
      return await db.cita.findMany({
        where: { id_anfitrion: user.id_usuario },
        include: {
          inmueble: true,
          estudiante: { select: { nombre: true, apellidos: true, numero_contacto: true } },
        },
        orderBy: { fecha_hora: "asc" },
      });
    }
  })
  // 3. Actualizar estado de una cita (solo anfitrión)
  .patch(
    "/:id/estado",
    async ({ params: { id }, body, user, set }) => {
      const cita = await db.cita.findUnique({
        where: { id_cita: id },
        include: { inmueble: true, estudiante: true },
      });
      if (!cita) {
        set.status = 404;
        return { error: "Cita no encontrada" };
      }
      if (cita.id_anfitrion !== user.id_usuario) {
        set.status = 403;
        return { error: "No eres el anfitrión de esta propiedad" };
      }
      const { estado, motivo_rechazo, nueva_fecha_hora } = body;
      const updateData: any = { estado };
      if (motivo_rechazo) updateData.motivo_rechazo = motivo_rechazo;
      if (nueva_fecha_hora) {
        const nuevaFecha = new Date(nueva_fecha_hora);
        if (isNaN(nuevaFecha.getTime()) || nuevaFecha <= new Date()) {
          set.status = 400;
          return { error: "Nueva fecha inválida" };
        }
        updateData.fecha_hora = nuevaFecha;
      }
      const citaActualizada = await db.cita.update({
        where: { id_cita: id },
        data: updateData,
        include: { estudiante: true, inmueble: true },
      });
      const ws = getWsClient();
      ws.emit("respuesta_cita", {
        id: citaActualizada.id_cita,
        aceptada: estado === "ACEPTADA",
        motivo: motivo_rechazo,
        estudianteId: citaActualizada.id_estudiante,
        propiedadId: citaActualizada.id_inmueble,
        propiedadTitulo: citaActualizada.inmueble.titulo,
        anfitrionNombre: `${user.nombre} ${user.apellidos}`,
        fecha: citaActualizada.fecha_hora.toISOString(),
      });
      return citaActualizada;
    },
    {
      body: t.Object({
        estado: t.Union([
          t.Literal("ACEPTADA"),
          t.Literal("RECHAZADA"),
          t.Literal("REAGENDADA"),
        ]),
        motivo_rechazo: t.Optional(t.String()),
        nueva_fecha_hora: t.Optional(t.String()),
      }),
    }
  );