import { Elysia, t } from 'elysia';
import { db } from '../db'; 
import { jwt } from "@elysiajs/jwt";

import { authPlugin } from "../middlewares/auth";

export const notificacionRoutes = new Elysia({ prefix: '/api/notificaciones' })
  .use(authPlugin)
  .derive(({ authenticatedUser }) => {
    if (authenticatedUser && (typeof authenticatedUser === "object" && "error" in (authenticatedUser as any))) {
      return { user: null, authError: (authenticatedUser as any).error };
    }
    return { user: authenticatedUser, authError: null };
  })

  // 0. Obtener contactos válidos
  .get('/contactos/:id', async ({ params: { id }, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }

    try {
      if (user.rol === "ESTUDIANTE") {
        const inmuebleRentado = await db.inmueble.findFirst({
          where: { id_estudiante: id },
          include: { arrendador: { select: { id_usuario: true, nombre: true, apellidos: true } } }
        });
        if (!inmuebleRentado) return [];
        return [{
          id_usuario: inmuebleRentado.arrendador.id_usuario,
          nombre: `${inmuebleRentado.arrendador.nombre} ${inmuebleRentado.arrendador.apellidos} (Arrendador)`
        }];
      } else {
        const inmueblesConInquilinos = await db.inmueble.findMany({
          where: { id_arrendador: id, id_estudiante: { not: null } },
          include: { estudiante: { select: { id_usuario: true, nombre: true, apellidos: true } } }
        });
        const inquilinos = inmueblesConInquilinos.map(i => ({
          id_usuario: i.estudiante!.id_usuario,
          nombre: `${i.estudiante!.nombre} ${i.estudiante!.apellidos} (${i.titulo})`
        }));
        return Array.from(new Map(inquilinos.map(item => [item.id_usuario, item])).values());
      }
    } catch (error) {
      set.status = 500;
      return { error: "Error al cargar contactos" };
    }
  })
  
  // 1. Marcar TODAS como vistas
  .post('/marcar-todo-leido/:id', async ({ params: { id }, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }
    if (user.id_usuario !== id && user.rol !== "ADMIN") {
      set.status = 403;
      return { error: "No autorizado" };
    }
    try {
      const result = await db.notificacion.updateMany({
        where: { usuario_id: id, visto: false },
        data: { visto: true }
      });
      return { success: true, count: result.count };
    } catch (error) {
      set.status = 500;
      return { error: "Error en servidor" };
    }
  })

  // 2. Obtener notificaciones (Incluyendo info del remitente)
  .get('/:id', async ({ params: { id }, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }
    if (user.id_usuario !== id && user.rol !== "ADMIN") {
      set.status = 403;
      return { error: "No autorizado" };
    }
    try {
      const notifications = await db.notificacion.findMany({
        where: { usuario_id: id },
        include: {
          remitente: {
            select: {
              nombre: true,
              apellidos: true,
              foto: true
            }
          }
        },
        orderBy: { fecha_creacion: 'desc' }
      });

      // Mapear para incluir el estado real de la cita relacionada
      const results = await Promise.all(notifications.map(async (n) => {
        if (n.relacionado_a && (
          n.tipo === 'solicitud_cita' || 
          n.tipo === 'respuesta_cita' || 
          n.tipo === 'decision_renta_pendiente' || 
          n.tipo === 'decision_renta'
        )) {
          const cita = await db.cita.findUnique({
            where: { id_cita: n.relacionado_a }
          });
          return { ...n, estado_cita: cita?.estado };
        }
        return n;
      }));

      return results;
    } catch (error) {
      set.status = 500;
      return { error: "Error al cargar" };
    }
  })
  
  // 3. Crear (Personalizada / Reporte)
  .post('/', async ({ body, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }

    try {
      const { usuario_id, titulo, mensaje, tipo, relacionado_a } = body;
      
      return await db.notificacion.create({
        data: {
          usuario_id, 
          titulo, 
          mensaje, 
          tipo: tipo || "REPORTE", 
          remitente_nombre: `${user.nombre} ${user.apellidos}`,
          remitente_id: user.id_usuario,
          visto: false, 
          relacionado_a
        }
      });
    } catch (error) {
      set.status = 500;
      return { error: "Error al crear" };
    }
  }, {
    body: t.Object({
      usuario_id: t.String(),
      titulo: t.String(),
      mensaje: t.String(),
      tipo: t.Optional(t.String()),
      relacionado_a: t.Optional(t.String())
    })
  })

  // 4. Marcar individual
  .patch('/:id/visto', async ({ params: { id }, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }
    try {
      const notif = await db.notificacion.findUnique({ where: { id: parseInt(id) } });
      if (!notif) return { error: "No encontrada" };
      if (notif.usuario_id !== user.id_usuario && user.rol !== "ADMIN") {
        set.status = 403;
        return { error: "No autorizado" };
      }
      await db.notificacion.update({
        where: { id: parseInt(id) }, 
        data: { visto: true }
      });
      return { success: true };
    } catch (error) {
      set.status = 500;
      return { error: "Error" };
    }
  })

  // 5. Eliminar todas las VISTAS
  .delete('/:id/todas', async ({ params: { id }, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }
    if (user.id_usuario !== id && user.rol !== "ADMIN") {
      set.status = 403;
      return { error: "No autorizado" };
    }
    try {
      const result = await db.notificacion.deleteMany({
        where: { usuario_id: id, visto: true }
      });
      return { success: true, count: result.count };
    } catch (error) {
      set.status = 500;
      return { error: "Error" };
    }
  })

  // 6. Eliminar una
  .delete('/:id', async ({ params: { id }, user, authError, set }) => {
    if (authError || !user) {
      set.status = 401;
      return { error: authError || "No autorizado" };
    }
    try {
      const notif = await db.notificacion.findUnique({ where: { id: parseInt(id) } });
      if (!notif) return { error: "No encontrada" };
      if (notif.usuario_id !== user.id_usuario && user.rol !== "ADMIN") {
        set.status = 403;
        return { error: "No autorizado" };
      }
      await db.notificacion.delete({ where: { id: parseInt(id) } });
      return { success: true };
    } catch (error) {
      set.status = 500;
      return { error: "Error" };
    }
  });