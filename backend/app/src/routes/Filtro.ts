import { Elysia } from 'elysia';
import { db } from '../db'; 

export const filtroRoutes = new Elysia({ prefix: '/api/inmuebles' })
  .get('/filtrar', async ({ query }) => {
    try {
      const { precioMax, servicios, restricciones } = query;
      const inmuebles = await db.inmueble.findMany({
        where: {
          estado: 'DISPONIBLE',
          ...(precioMax && {
            precio_mensual: {
              lte: parseFloat(precioMax as string)
            }
          }),
          ...(servicios && {
            servicios: {
              some: {
                nombre: { in: (servicios as string).split(',') }
              }
            }
          }),
          ...(restricciones && {
            restricciones: {
              some: {
                nombre: { in: (restricciones as string).split(',') }
              }
            }
          })
        },
        include: {
          servicios: true,
          restricciones: true,
          calificaciones: true,
          imagenes: true,
        }
      });
      return inmuebles;

    } catch (error) {
      console.error("Error al filtrar inmuebles:", error);
      return new Response(JSON.stringify({ error: "Fallo en la base de datos", detalle: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });