import { Elysia } from 'elysia';
import { db } from '../db'; 

import { Elysia, t } from 'elysia';
import { db } from '../db'; 
import { jwt } from "@elysiajs/jwt";

export const notificacionRoutes = new Elysia({ prefix: '/api' })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .derive(async ({ jwt, headers: { authorization }, set }) => {
    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      return { error: "No autorizado" };
    }
    const token = authorization.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || !payload.sub) {
      set.status = 401;
      return { error: "Token inválido" };
    }
    const user = await db.usuario.findUnique({
      where: { id_usuario: payload.sub as string },
    });
    if (!user) {
      set.status = 401;
      return { error: "Usuario no encontrado" };
    }
    return { user };
  })
  // Obtener notificaciones
  .get('/notificaciones/:usuario_id', async ({ params: { usuario_id }, user, set }) => {
    if (user.id_usuario !== usuario_id && user.rol !== "ADMIN") {
      set.status = 403;
      return { error: "No autorizado para ver estas notificaciones" };
    }
    try {
      return await db.notificacion.findMany({
        where: { usuario_id: usuario_id },
        orderBy: { fecha_creacion: 'desc' }
      });
    } catch (error) {
      set.status = 500;
      return { error: "Hubo un problema al cargar las notificaciones" };
    }
  })
  
  // Crear nueva notificación (Generalmente llamado internamente)
  .post('/notificaciones', async ({ body, set }) => {
    try {
      const { usuario_id, titulo, mensaje, tipo, remitente_nombre } = body as any;

      const nuevaNotificacion = await db.notificacion.create({
        data: {
          usuario_id, 
          titulo, 
          mensaje, 
          tipo, 
          remitente_nombre, 
          visto: false
        }
      });
      
      set.status = 201;
      return nuevaNotificacion;
    } catch (error) {
      set.status = 500;
      return { error: "Error al crear la notificación" };
    }
  })

  // Marcar notificación como vista
  .patch('/notificaciones/:id/visto', async ({ params: { id }, user, set }) => {
    try {
      const notif = await db.notificacion.findUnique({ where: { id_notificacion: parseInt(id) } });
      if (!notif) return { error: "Notificación no encontrada" };
      if (notif.usuario_id !== user.id_usuario && user.rol !== "ADMIN") {
        set.status = 403;
        return { error: "No autorizado" };
      }

      await db.notificacion.update({
        where: { id_notificacion: parseInt(id) }, 
        data: { visto: true }
      });
      return { success: true };
    } catch (error) {
      console.error(error);
      set.status = 500;
      return { error: "No se pudo actualizar" };
    }
  })

  // Eliminar todas las notificaciones de un usuario
  .delete('/notificaciones/:id/todas', async ({ params: { id }, user, set }) => {
    if (user.id_usuario !== id && user.rol !== "ADMIN") {
      set.status = 403;
      return { error: "No autorizado" };
    }
    try {
      await db.notificacion.deleteMany({
        where: { 
          usuario_id: id
        }
      });
      return { success: true };

    } catch (error) {
      set.status = 500;
      return { error: "No se pudo limpiar las notificaciones" };
    }
  })
  // Eliminar una notificación específica
  .delete('/notificaciones/:id', async ({ params: { id }, user, set }) => {
    try {
      const notif = await db.notificacion.findUnique({ where: { id_notificacion: parseInt(id) } });
      if (!notif) return { error: "Notificación no encontrada" };
      if (notif.usuario_id !== user.id_usuario && user.rol !== "ADMIN") {
        set.status = 403;
        return { error: "No autorizado" };
      }

      await db.notificacion.delete({
        where: { 
          id_notificacion: parseInt(id)
        }
      });
      return { success: true, message: "Notificación eliminada" };
    } catch (error) {
      set.status = 500;
      return { error: "No se pudo eliminar el mensaje" };
    }
  });