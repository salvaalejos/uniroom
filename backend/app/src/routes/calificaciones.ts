import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";

export const calificacionRoutes = new Elysia({ prefix: "/calificaciones" })
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
    let payload: any;
    try {
      payload = await jwt.verify(token);
    } catch {
      set.status = 401;
      return { error: "Token inválido" };
    }
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
    return { authenticatedUser: user };
  })
  .post(
    "/",
    async ({ body, authenticatedUser, set }) => {
      if ("error" in (authenticatedUser as any)) return authenticatedUser;

      const { id_inmueble, calificacion, comentario } = body;

      const existente = await db.calificacion.findFirst({
        where: {
          id_estudiante: authenticatedUser.id_usuario,
          id_inmueble,
        },
      });

      if (existente) {
        set.status = 409;
        return { error: "Ya calificaste este inmueble" };
      }

      await db.calificacion.create({
        data: {
          id_estudiante: authenticatedUser.id_usuario,
          id_inmueble,
          calificacion,
          descripcion: comentario || "",
        },
      });

      return { success: true };
    },
    {
      body: t.Object({
        id_inmueble: t.Number(),
        calificacion: t.Integer({ minimum: 1, maximum: 5 }),
        comentario: t.Optional(t.String()),
      }),
    }
  )
  // 2. Calificar a un estudiante (solo arrendadores)
  .post(
    "/estudiantes",
    async ({ body, authenticatedUser, set }) => {
      if ("error" in (authenticatedUser as any)) return authenticatedUser;

      // Solo arrendadores pueden calificar estudiantes
      if (authenticatedUser.rol !== "ARRENDADOR") {
        set.status = 403;
        return { error: "Solo los arrendadores pueden calificar estudiantes" };
      }

      const { id_estudiante, calificacion, comentario } = body;

      // Verificar que el estudiante existe
      const estudiante = await db.usuario.findUnique({
        where: { id_usuario: id_estudiante },
      });

      if (!estudiante) {
        set.status = 404;
        return { error: "Estudiante no encontrado" };
      }

      // Verificar que no haya calificación previa del mismo arrendador para este estudiante
      const existente = await db.calificacionEstudiante.findFirst({
        where: {
          id_arrendador: authenticatedUser.id_usuario,
          id_estudiante,
        },
      });

      if (existente) {
        set.status = 409;
        return { error: "Ya calificaste a este estudiante" };
      }

      await db.calificacionEstudiante.create({
        data: {
          id_arrendador: authenticatedUser.id_usuario,
          id_estudiante,
          calificacion,
          descripcion: comentario || "",
        },
      });

      // Calcular nuevo promedio
      const calificaciones = await db.calificacionEstudiante.findMany({
        where: { id_estudiante },
      });
      const promedio = calificaciones.reduce((acc, c) => acc + c.calificacion, 0) / calificaciones.length;

      return { success: true, rating: promedio };
    },
    {
      body: t.Object({
        id_estudiante: t.String(),
        calificacion: t.Integer({ minimum: 1, maximum: 5 }),
        comentario: t.Optional(t.String()),
      }),
    }
  );
