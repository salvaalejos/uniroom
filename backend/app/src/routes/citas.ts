import { Elysia, t } from "elysia";
import { db } from "../db";
import jwt from "@elysiajs/jwt";
import { emitToUser } from "../ws-server";

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
      emitToUser(nuevaCita.id_anfitrion, "solicitud_cita", {
        id: nuevaCita.id_cita,
        propiedadId: nuevaCita.id_inmueble,
        propiedadTitulo: nuevaCita.inmueble.titulo,
        estudianteId: nuevaCita.id_estudiante,
        estudianteNombre: `${nuevaCita.estudiante.nombre} ${nuevaCita.estudiante.apellidos}`,
        remitenteFoto: user.foto,
        anfitrionId: nuevaCita.id_anfitrion,
        fecha: nuevaCita.fecha_hora.toISOString(),
        mensaje: `Solicitud de visita para ${nuevaCita.inmueble.titulo} el ${nuevaCita.fecha_hora.toLocaleString()}`,
      });
      // Crear notificación en BD para el anfitrión
      await db.notificacion.create({
        data: {
          usuario_id: nuevaCita.id_anfitrion,
          titulo: "Nueva solicitud de visita",
          mensaje: `${nuevaCita.estudiante.nombre} ${nuevaCita.estudiante.apellidos} quiere visitar tu propiedad ${nuevaCita.inmueble.titulo} el ${nuevaCita.fecha_hora.toLocaleString()}`,
          tipo: "solicitud_cita",
          remitente_nombre: `${nuevaCita.estudiante.nombre} ${nuevaCita.estudiante.apellidos}`,
          remitente_id: user.id_usuario,
          visto: false,
          relacionado_a: nuevaCita.id_cita,
        },
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
  // 2. Obtener mis citas (Filtrando las ocultas)
  .get("/mis-citas", async ({ user }) => {
    if (user.rol === "ESTUDIANTE") {
      return await db.cita.findMany({
        where: { 
          id_estudiante: user.id_usuario,
          visto_estudiante: false 
        },
        include: {
          inmueble: true,
          anfitrion: { select: { nombre: true, apellidos: true, numero_contacto: true } },
        },
        orderBy: { fecha_hora: "asc" },
      });
    } else {
      return await db.cita.findMany({
        where: { 
          id_anfitrion: user.id_usuario,
          visto_anfitrion: false 
        },
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
      emitToUser(citaActualizada.id_estudiante, "respuesta_cita", {
        id: citaActualizada.id_cita,
        aceptada: estado === "ACEPTADA",
        motivo: motivo_rechazo,
        estudianteId: citaActualizada.id_estudiante,
        propiedadId: citaActualizada.id_inmueble,
        propiedadTitulo: citaActualizada.inmueble.titulo,
        anfitrionNombre: `${user.nombre} ${user.apellidos}`,
        remitenteFoto: user.foto,
        fecha: citaActualizada.fecha_hora.toISOString(),
      });
      // Crear notificación en BD para el estudiante
      await db.notificacion.create({
        data: {
          usuario_id: citaActualizada.id_estudiante,
          titulo: estado === "ACEPTADA" ? "Cita aceptada" : estado === "RECHAZADA" ? "Cita rechazada" : "Cita reagendada",
          mensaje:
            estado === "ACEPTADA"
              ? `Tu solicitud para visitar ${citaActualizada.inmueble.titulo} ha sido ACEPTADA. Fecha: ${citaActualizada.fecha_hora.toLocaleString()}`
              : estado === "RECHAZADA"
              ? `Tu solicitud para visitar ${citaActualizada.inmueble.titulo} fue RECHAZADA. Motivo: ${motivo_rechazo || "No especificado"}.`
              : `Tu cita para ${citaActualizada.inmueble.titulo} ha sido reagendada. Nueva fecha: ${citaActualizada.fecha_hora.toLocaleString()}`,
          tipo: "respuesta_cita",
          remitente_nombre: `${user.nombre} ${user.apellidos}`,
          remitente_id: user.id_usuario,
          visto: false,
          relacionado_a: citaActualizada.id_cita,
        },
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
  )
  // 4. Marcar cita como realizada (solo anfitrión)
  .patch(
    "/:id/realizada",
    async ({ params: { id }, user, set }) => {
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
      if (cita.estado !== "ACEPTADA") {
        set.status = 400;
        return { error: "Solo se pueden marcar como realizadas las citas aceptadas" };
      }
      const citaActualizada = await db.cita.update({
        where: { id_cita: id },
        data: { estado: "REALIZADA" },
        include: { estudiante: true, inmueble: true },
      });
      // Crear notificación en BD para el anfitrión: preguntar si autoriza la renta
      await db.notificacion.create({
        data: {
          usuario_id: citaActualizada.id_anfitrion,
          titulo: "Decisión de renta requerida",
          mensaje: `La visita de ${citaActualizada.estudiante.nombre} ${citaActualizada.estudiante.apellidos} a ${citaActualizada.inmueble.titulo} se realizó. ¿Deseas autorizarlo para rentar?`,
          tipo: "decision_renta",
          remitente_nombre: "Sistema UniRoom",
          visto: false,
          relacionado_a: citaActualizada.id_cita,
        },
      });
      // Notificar al anfitrión vía WebSocket
      emitToUser(citaActualizada.id_anfitrion, "decision_renta_pendiente", {
        id: citaActualizada.id_cita,
        propiedadId: citaActualizada.id_inmueble,
        propiedadTitulo: citaActualizada.inmueble.titulo,
        estudianteId: citaActualizada.id_estudiante,
        estudianteNombre: `${citaActualizada.estudiante.nombre} ${citaActualizada.estudiante.apellidos}`,
        remitenteFoto: citaActualizada.estudiante.foto,
        anfitrionId: citaActualizada.id_anfitrion,
        fecha: citaActualizada.fecha_hora.toISOString(),
        mensaje: `La visita de ${citaActualizada.estudiante.nombre} ${citaActualizada.estudiante.apellidos} a ${citaActualizada.inmueble.titulo} se realizó. ¿Deseas autorizarlo para rentar?`,
      });
      return citaActualizada;
    }
  )
  // 5. Decisión de renta (solo anfitrión)
  .patch(
    "/:id/decision-renta",
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
      if (cita.estado !== "REALIZADA") {
        set.status = 400;
        return { error: "Solo se puede decidir sobre citas realizadas" };
      }
      const { decision } = body;
      if (decision !== "APROBAR" && decision !== "RECHAZAR") {
        set.status = 400;
        return { error: "Decisión debe ser APROBAR o RECHAZAR" };
      }
      const nuevoEstado = decision === "APROBAR" ? "RENTA_APROBADA" : "RENTA_RECHAZADA";
      // Si aprueba, actualizar el inmueble con el estudiante autorizado
      if (decision === "APROBAR") {
        await db.inmueble.update({
          where: { id_inmueble: cita.id_inmueble },
          data: { id_estudiante_autorizado: cita.id_estudiante },
        });
      }
      const citaActualizada = await db.cita.update({
        where: { id_cita: id },
        data: { estado: nuevoEstado },
        include: { estudiante: true, inmueble: true },
      });
      // Crear notificación en BD para el estudiante
      await db.notificacion.create({
        data: {
          usuario_id: citaActualizada.id_estudiante,
          titulo: decision === "APROBAR" ? "¡Renta aprobada!" : "Renta rechazada",
          mensaje:
            decision === "APROBAR"
              ? `El arrendador ${user.nombre} ${user.apellidos} te ha autorizado para rentar ${citaActualizada.inmueble.titulo}. ¡Procede al pago para confirmar tu renta!`
              : `El arrendador ${user.nombre} ${user.apellidos} ha decidido no autorizarte para rentar ${citaActualizada.inmueble.titulo}.`,
          tipo: "decision_renta",
          remitente_nombre: `${user.nombre} ${user.apellidos}`,
          remitente_id: user.id_usuario,
          visto: false,
          relacionado_a: citaActualizada.id_cita,
        },
      });
      // Notificar al estudiante vía WebSocket
      emitToUser(citaActualizada.id_estudiante, "decision_renta", {
        id: citaActualizada.id_cita,
        aceptada: decision === "APROBAR",
        propiedadId: citaActualizada.id_inmueble,
        propiedadTitulo: citaActualizada.inmueble.titulo,
        anfitrionNombre: `${user.nombre} ${user.apellidos}`,
        remitenteFoto: user.foto,
        fecha: citaActualizada.fecha_hora.toISOString(),
        mensaje:
          decision === "APROBAR"
            ? `Has sido autorizado para rentar ${citaActualizada.inmueble.titulo}`
            : `No fuiste seleccionado para rentar ${citaActualizada.inmueble.titulo}`,
      });
      return citaActualizada;
    },
    {
      body: t.Object({
        decision: t.Union([t.Literal("APROBAR"), t.Literal("RECHAZAR")]),
      }),
    }
  )
  // 6. Ocultar cita para un usuario
  .patch(
    "/:id/ocultar",
    async ({ params: { id }, user, set }) => {
      const cita = await db.cita.findUnique({
        where: { id_cita: id },
      });

      if (!cita) {
        set.status = 404;
        return { error: "Cita no encontrada" };
      }

      const esEstudiante = cita.id_estudiante === user.id_usuario;
      const esAnfitrion = cita.id_anfitrion === user.id_usuario;

      if (!esEstudiante && !esAnfitrion) {
        set.status = 403;
        return { error: "No autorizado" };
      }

      const updateData: any = {};
      if (esEstudiante) updateData.visto_estudiante = true;
      if (esAnfitrion) updateData.visto_anfitrion = true;

      await db.cita.update({
        where: { id_cita: id },
        data: updateData,
      });

      return { success: true };
    }
  )
  // 7. Ocultar todas las citas finalizadas de un usuario
  .patch(
    "/ocultar-todas",
    async ({ user }) => {
      const estadosFinales = ['RENTA_APROBADA', 'RECHAZADA', 'RENTA_RECHAZADA'];
      
      // Ocultar como estudiante
      await db.cita.updateMany({
        where: {
          id_estudiante: user.id_usuario,
          estado: { in: estadosFinales as any },
        },
        data: { visto_estudiante: true },
      });

      // Ocultar como anfitrión
      await db.cita.updateMany({
        where: {
          id_anfitrion: user.id_usuario,
          estado: { in: estadosFinales as any },
        },
        data: { visto_anfitrion: true },
      });

      return { success: true };
    }
  );
