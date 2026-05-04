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
  .post(
    "/:id/upload-foto",
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

      if (!body.foto) {
        set.status = 400;
        return { error: "No se recibió ninguna imagen" };
      }

      const fileName = `${Date.now()}-${id}${body.foto.name.match(/\.[a-zA-Z]+$/)?.[0] || '.jpg'}`;
      const destination = `./uploads/${fileName}`;

      await Bun.write(destination, body.foto);

      const fotoPath = `/public/${fileName}`;

      await db.usuario.update({
        where: { id_usuario: id },
        data: { foto: fotoPath },
      });

      return { mensaje: "Foto actualizada correctamente", foto: fotoPath };
    },
    {
      body: t.Object({
        foto: t.File({
          type: ['image/jpeg', 'image/png', 'image/jpg'],
          maxSize: '5m',
        }),
      }),
    }
  )
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

      let fotoPath = existingUser.foto;
      if (body.foto) {
        const fileName = `${Date.now()}-${body.foto.name}`;
        const destination = `./uploads/${fileName}`;
        await Bun.write(destination, body.foto);
        fotoPath = `/public/${fileName}`;
      }

      const updateData: any = {
        ...body
      };

      if (updateData.password) {
        updateData.password = await Bun.password.hash(updateData.password);
      }

      if (body.foto) {
        updateData.foto = fotoPath;
      } else {
        delete updateData.foto;
      }

      if (updateData.edad) updateData.edad = parseInt(updateData.edad as string, 10);
      if (updateData.visibilidad === 'true') updateData.visibilidad = true;
      if (updateData.visibilidad === 'false') updateData.visibilidad = false;

      const updatedUser = await db.usuario.update({
        where: { id_usuario: id },
        data: updateData,
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
          edad: t.Optional(t.Any()),
          foto: t.Optional(t.File({
              type: ['image/jpeg', 'image/png', 'image/jpg'],
              maxSize: '5m'
          })),
          visibilidad: t.Optional(t.Any()),
          email: t.Optional(t.String()),
          password: t.Optional(t.String()),
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
