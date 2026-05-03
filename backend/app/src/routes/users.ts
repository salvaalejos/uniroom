import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";

export const usersRoutes = new Elysia({ prefix: "/users" })
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
    return { authenticatedUser: user };
  })
  .get("/", async ({ authenticatedUser, set }) => {
    if (authenticatedUser.rol !== "ADMIN") {
      set.status = 403;
      return { error: "No autorizado" };
    }

    // Lista usuarios omitiendo contraseñas
    const users = await db.usuario.findMany({
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        apellidos: true,
        rol: true,
        estado: true,
        fecha_creacion: true,
      },
    });
    return users;
  })
  .get("/:id", async ({ params: { id }, authenticatedUser, set }) => {
    const canAccess = authenticatedUser.rol === "ADMIN" || authenticatedUser.id_usuario === id;
    
    if (!canAccess) {
      set.status = 403;
      return { error: "No autorizado" };
    }

    const user = await db.usuario.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        apellidos: true,
        rol: true,
        estado: true,
        numero_contacto: true,
        genero: true,
        edad: true,
        foto: true,
        visibilidad: true,
        email_verificado: true,
        fecha_creacion: true
      }
    });

    if (!user) {
      set.status = 404;
      return { error: "Usuario no encontrado" };
    }

    return user;
  })
  .get("/:id/transactions", async ({ params: { id }, authenticatedUser, set }) => {
    const canAccess = authenticatedUser.rol === "ADMIN" || authenticatedUser.id_usuario === id;
    
    if (!canAccess) {
      set.status = 403;
      return { error: "No autorizado" };
    }

    const transactions = await db.transaccion.findMany({
      where: { id_usuario: id },
      orderBy: { fecha_creacion: 'desc' }
    });

    return transactions;
  })
  .put(
    "/:id",
    async ({ params: { id }, body, authenticatedUser, set }) => {
      const canAccess = authenticatedUser.rol === "ADMIN" || authenticatedUser.id_usuario === id;

      if (!canAccess) {
        set.status = 403;
        return { error: "No autorizado" };
      }

      const existingUser = await db.usuario.findUnique({
        where: { id_usuario: id },
      });

      if (!existingUser) {
        set.status = 404;
        return { error: "Usuario no encontrado" };
      }

      const updatedUser = await db.usuario.update({
        where: { id_usuario: id },
        data: body,
        select: {
          id_usuario: true,
          email: true,
          nombre: true,
          apellidos: true,
          numero_contacto: true,
          genero: true,
          edad: true,
          foto: true,
          rol: true,
          estado: true,
          visibilidad: true,
          fecha_creacion: true,
        },
      });

      return updatedUser;
    },
    {
      body: t.Partial(
        t.Object({
          nombre: t.String(),
          apellidos: t.String(),
          numero_contacto: t.String(),
          genero: t.Union([t.Literal("MASCULINO"), t.Literal("FEMENINO"), t.Literal("OTRO")]),
          edad: t.Integer({ minimum: 0 }),
          foto: t.String(),
          visibilidad: t.Boolean(),
        })
      ),
    }
  )
  .delete("/:id", async ({ params: { id }, authenticatedUser, set }) => {
    const canAccess = authenticatedUser.rol === "ADMIN" || authenticatedUser.id_usuario === id;

    if (!canAccess) {
      set.status = 403;
      return { error: "No autorizado" };
    }

    const existingUser = await db.usuario.findUnique({
      where: { id_usuario: id },
    });

    if (!existingUser) {
      set.status = 404;
      return { error: "Usuario no encontrado" };
    }

    // Soft delete (Suspender cuenta)
    const suspendedUser = await db.usuario.update({
      where: { id_usuario: id },
      data: { estado: "SUSPENDIDO" },
      select: {
        id_usuario: true,
        estado: true,
      },
    });

    return suspendedUser;
  });
