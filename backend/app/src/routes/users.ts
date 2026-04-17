import { Elysia, t } from "elysia";
import { db } from "../db";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .get("/", async () => {
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
  .get("/:id", async ({ params: { id }, set }) => {
    const user = await db.usuario.findUnique({
      where: { id_usuario: id },
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

    if (!user) {
      set.status = 404;
      return { error: "Usuario no encontrado" };
    }

    return user;
  })
  .put(
    "/:id",
    async ({ params: { id }, body, set }) => {
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
          edad: t.Number(),
          foto: t.String(),
          visibilidad: t.Boolean(),
        })
      ),
    }
  )
  .delete("/:id", async ({ params: { id }, set }) => {
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
