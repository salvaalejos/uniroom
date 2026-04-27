import { Elysia } from 'elysia';
import { db } from '../db'; 

export const notificacionRoutes = new Elysia()
  .group('/api', (app) => 
    app
      // Obtener notificaciones
      .get('/notificaciones/:usuario_id', async ({ params: { usuario_id }, set }) => {
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
      
      // Crear nueva notificación
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
          return { error: "Error al enviar el reporte" };
        }
      })

      // Marcar notificación como vista
      .patch('/notificaciones/:id/visto', async ({ params: { id }, set }) => {
  try {
    await db.notificacion.update({
      where: { id_notificacion: id }, 
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
.delete('/notificaciones/:id/todas', async ({ params: { id }, set }) => {
  try {
     await db.notificacion.deleteMany({
      where: { 
        usuario_id: id
      }
    });
    return { success: true };

  } catch (error) {
    set.status = 500;
    return { error: "No se pudo limpiar la base de datos" };
  }
})
        // Eliminar una notificación específica
.delete('/notificaciones/:id', async ({ params: { id }, set }) => {
  try {
    await db.notificacion.delete({
      where: { 
        id_notificacion: id
      }
    });
    return { success: true, message: "Notificación eliminada" };
  } catch (error) {
    set.status = 500;
    return { error: "No se pudo eliminar el mensaje" };
  }
})
  );