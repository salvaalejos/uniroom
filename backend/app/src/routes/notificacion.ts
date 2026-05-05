import { Elysia, t } from 'elysia';
import { db } from '../db'; 
import { jwt } from "@elysiajs/jwt";

export const notificacionRoutes = new Elysia({ prefix: '/api/notificaciones' })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .derive(async ({ jwt, headers: { authorization } }) => {
    if (!authorization?.startsWith("Bearer ")) {
      return { user: null, authError: "No autorizado" };
    }
    const token = authorization.slice(7);
    try {
      const payload = await jwt.verify(token);
      if (!payload || !payload.sub) {
        return { user: null, authError: "Token inválido" };
      }
      const user = await db.usuario.findUnique({
        where: { id_usuario: payload.sub as string },
      });
      if (!user) {
        return { user: null, authError: "Usuario no encontrado" };
      }
      return { user, authError: null };
    } catch (e) {
      return { user: null, authError: "Error de sesión" };
    }
  })
  
  // 1. Marcar TODAS como vistas
  .post('/marcar-todo-leido/:id', async ({ params: { id }, user, authError, set }) => {
    console.log(`[Backend] Marcar todo leído para usuario: ${id}`);
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
        where: { 
          usuario_id: id,
          visto: false
        },
        data: { visto: true }
      });
      console.log(`[Backend] Se marcaron ${result.count} mensajes como leídos.`);
      return { success: true, count: result.count };
    } catch (error) {
      console.error("[Backend] Error updateMany:", error);
      set.status = 500;
      return { error: "Error en servidor" };
    }
  })

  // 2. Obtener notificaciones
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
      return await db.notificacion.findMany({
        where: { usuario_id: id },
        orderBy: { fecha_creacion: 'desc' }
      });
    } catch (error) {
      set.status = 500;
      return { error: "Error al cargar" };
    }
  })
  
  // 3. Crear (Interno)
  .post('/', async ({ body, set }) => {
    try {
      const { usuario_id, titulo, mensaje, tipo, remitente_nombre, relacionado_a } = body as any;
      return await db.notificacion.create({
        data: {
          usuario_id, titulo, mensaje, tipo, remitente_nombre,
          visto: false, relacionado_a
        }
      });
    } catch (error) {
      set.status = 500;
      return { error: "Error" };
    }
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
    console.log(`[Backend] Intentando eliminar notificaciones vistas para usuario: ${id}`);
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
      console.log(`[Backend] Se eliminaron ${result.count} notificaciones físicamente.`);
      return { success: true, count: result.count };
    } catch (error) {
      console.error("[Backend] Error al borrar:", error);
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