import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";
import { existsSync, mkdirSync } from "node:fs";

export const inmueblesRoutes = new Elysia({ prefix: "/inmuebles" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .derive(async ({ jwt, headers: { authorization } }) => {
    if (!authorization?.startsWith("Bearer ")) {
      return { authenticatedUser: null };
    }
    const token = authorization.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || !payload.sub) {
      return { authenticatedUser: null };
    }
    const user = await db.usuario.findUnique({
      where: { id_usuario: payload.sub as string },
    });
    return { authenticatedUser: user };
  })
  // 1. Listar todos los inmuebles (público, pero se puede filtrar)
  .get("/", async ({ authenticatedUser, query }) => {
    const { estado, tipo, arrendadorId } = query;

    const where: any = {};
    if (estado) where.estado = estado;
    if (tipo) where.tipo_inmueble = tipo;
    if (arrendadorId) where.id_arrendador = arrendadorId;

    // Si no es admin ni arrendador del inmueble, solo mostrar DISPONIBLE por defecto
    const isAdmin = authenticatedUser?.rol === "ADMIN";
    if (!authenticatedUser || (!isAdmin && !arrendadorId)) {
      where.estado = "DISPONIBLE";
    }

    const inmuebles = await db.inmueble.findMany({
      where,
      include: {
        arrendador: { select: { nombre: true, apellidos: true, numero_contacto: true } },
        servicios: true,
        restricciones: true,
        imagenes: true,
        calificaciones: { take: 5, orderBy: { fecha_creacion: "desc" } },
      },
      orderBy: { fecha_creacion: "desc" },
    });
    return inmuebles;
  }, {
    query: t.Object({
      estado: t.Optional(t.Union([t.Literal("DISPONIBLE"), t.Literal("OCUPADO"), t.Literal("OCULTO")])),
      tipo: t.Optional(t.Union([t.Literal("CASA"), t.Literal("DEPA"), t.Literal("CUARTO")])),
      arrendadorId: t.Optional(t.String()),
    }),
  })

  // 2. Obtener un inmueble por ID
  .get("/:id", async ({ params: { id }, authenticatedUser, set }) => {
    const inmueble = await db.inmueble.findUnique({
      where: { id_inmueble: parseInt(id) },
      include: {
        arrendador: { select: { nombre: true, apellidos: true, numero_contacto: true } },
        servicios: true,
        restricciones: true,
        imagenes: true,
        calificaciones: { include: { estudiante: { select: { nombre: true, apellidos: true } } }, orderBy: { fecha_creacion: "desc" } },
      },
    });

    if (!inmueble) {
      set.status = 404;
      return { error: "Inmueble no encontrado" };
    }

    // Si está OCULTO, solo el arrendador o admin pueden verlo
    if (inmueble.estado === "OCULTO") {
      if (!authenticatedUser) {
        set.status = 401;
        return { error: "No autenticado" };
      }
      const isAdmin = authenticatedUser.rol === "ADMIN";
      if (!isAdmin && authenticatedUser.id_usuario !== inmueble.id_arrendador) {
        set.status = 403;
        return { error: "No autorizado para ver este inmueble oculto" };
      }
    }

    return inmueble;
  })

  // 3. Crear un nuevo inmueble (solo arrendadores)
  .post(
    "/",
    async ({ body, authenticatedUser, set }) => {
      if (!authenticatedUser) {
        set.status = 401;
        return { error: "No autenticado" };
      }
      if (authenticatedUser.rol !== "ARRENDADOR" && authenticatedUser.rol !== "ADMIN") {
        set.status = 403;
        return { error: "Solo los arrendadores pueden crear inmuebles" };
      }

      // Desestructurar y parsear datos del FormData
      const precio_mensual = parseFloat(body.precio_mensual as string);
      const { descripcion, direccion_latitud, direccion_longitud, tipo_inmueble, titulo } = body;
      
      // Parsear servicios y restricciones si vienen como JSON string
      let serviciosIds: number[] = [];
      let restriccionesIds: number[] = [];
      try {
        if (typeof body.servicios === 'string') serviciosIds = JSON.parse(body.servicios);
        if (typeof body.restricciones === 'string') restriccionesIds = JSON.parse(body.restricciones);
      } catch (e) {
        console.error("Error parsing JSON arrays:", e);
      }

      // Procesar imágenes/videos
      const mediaPaths: string[] = [];
      const housesDir = "./uploads/houses";
      
      if (!existsSync(housesDir)) {
        mkdirSync(housesDir, { recursive: true });
      }

      const files = body.imagenes ? (Array.isArray(body.imagenes) ? body.imagenes : [body.imagenes]) : [];
      
      for (const file of files) {
        if (file instanceof File) {
          const fileName = `${Date.now()}-${file.name}`;
          const destination = `${housesDir}/${fileName}`;
          await Bun.write(destination, file);
          mediaPaths.push(`/public/houses/${fileName}`);
        }
      }

      const nuevoInmueble = await db.inmueble.create({
        data: {
          titulo: titulo as string || "Inmueble sin título",
          precio_mensual,
          descripcion: descripcion as string,
          direccion_latitud: direccion_latitud ? parseFloat(direccion_latitud as string) : null,
          direccion_longitud: direccion_longitud ? parseFloat(direccion_longitud as string) : null,
          tipo_inmueble: tipo_inmueble as any,
          id_arrendador: authenticatedUser.id_usuario,
          servicios: serviciosIds.length ? { connect: serviciosIds.map(id => ({ id_servicios: id })) } : undefined,
          restricciones: restriccionesIds.length ? { connect: restriccionesIds.map(id => ({ id_restriccion: id })) } : undefined,
          imagenes: mediaPaths.length ? { create: mediaPaths.map(path => ({ imagen: path })) } : undefined,
        },
        include: { servicios: true, restricciones: true, imagenes: true },
      });

      set.status = 201;
      return nuevoInmueble;
    },
    {
      body: t.Object({
        titulo: t.Optional(t.String()),
        precio_mensual: t.String(),
        descripcion: t.Optional(t.String()),
        direccion_latitud: t.Optional(t.String()),
        direccion_longitud: t.Optional(t.String()),
        tipo_inmueble: t.String(),
        servicios: t.Optional(t.String()), // JSON string de array de IDs
        restricciones: t.Optional(t.String()), // JSON string de array de IDs
        imagenes: t.Optional(t.Files({ maxSize: '10m' })),
      }),
    }
  )

  // 4. Actualizar un inmueble (solo arrendador dueño o admin)
  .put(
    "/:id",
    async ({ params: { id }, body, authenticatedUser, set }) => {
      if (!authenticatedUser) {
        set.status = 401;
        return { error: "No autenticado" };
      }
      const inmueble = await db.inmueble.findUnique({
        where: { id_inmueble: parseInt(id) },
      });
      if (!inmueble) {
        set.status = 404;
        return { error: "Inmueble no encontrado" };
      }
      
      const isAdmin = authenticatedUser.rol === "ADMIN";
      if (!isAdmin && authenticatedUser.id_usuario !== inmueble.id_arrendador) {
        set.status = 403;
        return { error: "No autorizado para modificar este inmueble" };
      }

      const { precio_mensual, estado, descripcion, direccion_latitud, direccion_longitud, tipo_inmueble, id_estudiante, servicios, restricciones, imagenes } = body;

      const updateData: any = {};
      if (precio_mensual !== undefined) updateData.precio_mensual = precio_mensual;
      if (estado !== undefined) updateData.estado = estado;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (direccion_latitud !== undefined) updateData.direccion_latitud = direccion_latitud ? parseFloat(direccion_latitud) : null;
      if (direccion_longitud !== undefined) updateData.direccion_longitud = direccion_longitud ? parseFloat(direccion_longitud) : null;
      if (tipo_inmueble !== undefined) updateData.tipo_inmueble = tipo_inmueble;
      if (id_estudiante !== undefined) updateData.id_estudiante = id_estudiante;

      // Actualizar relaciones (servicios, restricciones, imágenes)
      if (servicios) updateData.servicios = { set: servicios.map(id => ({ id_servicios: id })) };
      if (restricciones) updateData.restricciones = { set: restricciones.map(id => ({ id_restriccion: id })) };
      if (imagenes) {
        // Borrar imágenes existentes y crear nuevas
        await db.imagenes.deleteMany({ where: { id_inmueble: inmueble.id_inmueble } });
        updateData.imagenes = { create: imagenes.map(img => ({ imagen: img })) };
      }

      const inmuebleActualizado = await db.inmueble.update({
        where: { id_inmueble: parseInt(id) },
        data: updateData,
        include: { servicios: true, restricciones: true, imagenes: true },
      });
      return inmuebleActualizado;
    },
    {
      body: t.Partial(
        t.Object({
          precio_mensual: t.Number(),
          estado: t.Union([t.Literal("DISPONIBLE"), t.Literal("OCUPADO"), t.Literal("OCULTO")]),
          descripcion: t.String(),
          direccion_latitud: t.String(),
          direccion_longitud: t.String(),
          tipo_inmueble: t.Union([t.Literal("CASA"), t.Literal("DEPA"), t.Literal("CUARTO")]),
          id_estudiante: t.String(),
          servicios: t.Array(t.Number()),
          restricciones: t.Array(t.Number()),
          imagenes: t.Array(t.String()),
        })
      ),
    }
  )

  // 5. Eliminar (ocultar) un inmueble – soft delete (cambiar a OCULTO)
  .delete("/:id", async ({ params: { id }, authenticatedUser, set }) => {
    if (!authenticatedUser) {
      set.status = 401;
      return { error: "No autenticado" };
    }
    const inmueble = await db.inmueble.findUnique({
      where: { id_inmueble: parseInt(id) },
    });
    if (!inmueble) {
      set.status = 404;
      return { error: "Inmueble no encontrado" };
    }
    
    const isAdmin = authenticatedUser.rol === "ADMIN";
    if (!isAdmin && authenticatedUser.id_usuario !== inmueble.id_arrendador) {
      set.status = 403;
      return { error: "No autorizado para eliminar este inmueble" };
    }

    const inmuebleOculto = await db.inmueble.update({
      where: { id_inmueble: parseInt(id) },
      data: { estado: "OCULTO" },
    });
    return { message: "Inmueble ocultado correctamente", inmueble: inmuebleOculto };
  });