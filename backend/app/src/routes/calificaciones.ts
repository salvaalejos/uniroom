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
  );
