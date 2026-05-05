import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";
import { emitToUser } from "../ws-server";

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
  .get("/", async ({ authenticatedUser, set }) => {
    if ("error" in (authenticatedUser as any)) return authenticatedUser;
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
    if ("error" in (authenticatedUser as any)) return authenticatedUser;
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

    // Calcular rating promedio para estudiantes
    let rating = 0;
    if (user.rol === "ESTUDIANTE") {
      const calificaciones = await db.calificacionEstudiante.findMany({
        where: { id_estudiante: id },
        select: { calificacion: true }
      });
      if (calificaciones.length > 0) {
        rating = calificaciones.reduce((acc, c) => acc + c.calificacion, 0) / calificaciones.length;
      }
    }

    return { ...user, rating };
  })
  .get("/:id/transactions", async ({ params: { id }, authenticatedUser, set }) => {
    if ("error" in (authenticatedUser as any)) return authenticatedUser;
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
      if ("error" in (authenticatedUser as any)) return authenticatedUser;
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
      if ("error" in (authenticatedUser as any)) return authenticatedUser;
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
    if ("error" in (authenticatedUser as any)) return authenticatedUser;
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
  })
  // Obtener la renta actual del estudiante
  .get("/:id/renta-actual", async ({ params: { id }, authenticatedUser, set }) => {
    if ("error" in (authenticatedUser as any)) return authenticatedUser;
    const canAccess = authenticatedUser.rol === "ADMIN" || authenticatedUser.id_usuario === id;
    if (!canAccess) {
      set.status = 403;
      return { error: "No autorizado" };
    }

    const inmuebleRentado = await db.inmueble.findFirst({
      where: {
        id_estudiante: id,
        estado: "OCUPADO",
      },
      include: {
        arrendador: { select: { id_usuario: true, nombre: true, apellidos: true, numero_contacto: true, foto: true } },
        servicios: true,
        restricciones: true,
        imagenes: true,
      },
    });

    if (!inmuebleRentado) {
      return { rentaActual: null };
    }

    const ahora = new Date();
    const fechaInicio = inmuebleRentado.fecha_inicio_renta || ahora;
    const fechaFin = inmuebleRentado.fecha_fin_renta || ahora;
    const diasTotales = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.ceil((fechaFin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));

    // Construir media array para el frontend (paths relativos)
    const media = inmuebleRentado.imagenes.map((img) => {
      const isVideo = img.imagen.match(/\.(mp4|mov|avi|wmv)$/i);
      return {
        tipo: isVideo ? "video" : "imagen",
        src: img.imagen,
      };
    });

    return {
      rentaActual: {
        id_inmueble: inmuebleRentado.id_inmueble,
        titulo: inmuebleRentado.titulo,
        precio_mensual: Number(inmuebleRentado.precio_mensual),
        descripcion: inmuebleRentado.descripcion,
        arrendador: {
          nombre: `${inmuebleRentado.arrendador.nombre} ${inmuebleRentado.arrendador.apellidos}`,
          numero_contacto: inmuebleRentado.arrendador.numero_contacto,
          foto: inmuebleRentado.arrendador.foto,
        },
        servicios: inmuebleRentado.servicios,
        restricciones: inmuebleRentado.restricciones,
        media,
        fecha_inicio_renta: fechaInicio,
        fecha_fin_renta: fechaFin,
        fecha_inicio_str: fechaInicio.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
        fecha_fin_str: fechaFin.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
        dias_totales: diasTotales,
        dias_restantes: Math.max(0, diasRestantes),
      },
    };
  })
  // Cancelar renta activa del estudiante
  .delete("/:id/cancelar-renta", async ({ params: { id }, authenticatedUser, set }) => {
    if ("error" in (authenticatedUser as any)) return authenticatedUser;
    const canAccess = authenticatedUser.rol === "ADMIN" || authenticatedUser.id_usuario === id;
    if (!canAccess) {
      set.status = 403;
      return { error: "No autorizado" };
    }

    const inmuebleRentado = await db.inmueble.findFirst({
      where: {
        id_estudiante: id,
        estado: "OCUPADO",
      },
    });

    if (!inmuebleRentado) {
      set.status = 404;
      return { error: "No tienes una renta activa para cancelar" };
    }

    await db.inmueble.update({
      where: { id_inmueble: inmuebleRentado.id_inmueble },
      data: {
        estado: "DISPONIBLE",
        id_estudiante: null,
        id_estudiante_autorizado: null,
        fecha_inicio_renta: null,
        fecha_fin_renta: null,
      },
    });

    // Notificar al arrendador
    await db.notificacion.create({
      data: {
        usuario_id: inmuebleRentado.id_arrendador,
        titulo: "Renta cancelada",
        mensaje: `El estudiante ${authenticatedUser.nombre} ${authenticatedUser.apellidos} ha cancelado la renta de ${inmuebleRentado.titulo}.`,
        tipo: "renta_cancelada",
        remitente_nombre: `${authenticatedUser.nombre} ${authenticatedUser.apellidos}`,
        visto: false,
        relacionado_a: inmuebleRentado.id_inmueble.toString(),
      },
    });

    // Notificar al arrendador para calificar al estudiante
    const notifCalificar = await db.notificacion.create({
      data: {
        usuario_id: inmuebleRentado.id_arrendador,
        titulo: "Califica al estudiante",
        mensaje: `Tu renta con ${authenticatedUser.nombre} ${authenticatedUser.apellidos} ha finalizado. ¡Califícalo para ayudar a otros arrendadores!`,
        tipo: "calificar_estudiante",
        remitente_nombre: `${authenticatedUser.nombre} ${authenticatedUser.apellidos}`,
        visto: false,
        relacionado_a: authenticatedUser.id_usuario,
      },
    });

    // Enviar notificación vía WebSocket
    emitToUser(inmuebleRentado.id_arrendador, "calificar_estudiante", {
      id: notifCalificar.id,
      titulo: notifCalificar.titulo,
      mensaje: notifCalificar.mensaje,
      estudianteId: authenticatedUser.id_usuario,
      estudianteNombre: `${authenticatedUser.nombre} ${authenticatedUser.apellidos}`,
      tipo: "calificar_estudiante",
    });

    return { success: true, message: "Renta cancelada exitosamente" };
  });
