import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";
import { existsSync, mkdirSync } from "node:fs";

console.log("[Inmuebles] Cargando rutas de inmuebles...");

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
      console.log("=== PETICION RECIBIDA: POST /inmuebles ===");
      try {
        if (!authenticatedUser) {
          console.error("[Inmuebles] Error: No hay usuario en el token");
          set.status = 401;
          return { error: "No autenticado" };
        }

        const { titulo, precio_mensual, descripcion, direccion_latitud, direccion_longitud, tipo_inmueble, servicios, restricciones, imagenes } = body as any;

        console.log("[Inmuebles] Datos básicos:", { titulo, tipo_inmueble, precio_mensual });

        const precio = parseFloat(precio_mensual);
        const lat = parseFloat(direccion_latitud);
        const lng = parseFloat(direccion_longitud);

        if (isNaN(precio)) {
          set.status = 400;
          return { error: "El precio debe ser un número válido" };
        }

        // Mapear tipos
        let tipoFinal: any = tipo_inmueble;
        if (tipoFinal === "Departamento") tipoFinal = "DEPA";
        else if (tipoFinal === "Casa") tipoFinal = "CASA";
        else if (tipoFinal === "Cuarto") tipoFinal = "CUARTO";
        else if (!["CASA", "DEPA", "CUARTO"].includes(tipoFinal)) tipoFinal = "CUARTO";

        // Parsear arrays
        let sIds: number[] = [];
        let rIds: number[] = [];
        try {
          if (servicios) sIds = typeof servicios === 'string' ? JSON.parse(servicios) : servicios;
          if (restricciones) rIds = typeof restricciones === 'string' ? JSON.parse(restricciones) : restricciones;
        } catch (e) {
          console.warn("[Inmuebles] Error parseando servicios/restricciones");
        }

        // VALIDACIÓN PREVIA DE IDs (Para evitar error P2025)
        // Filtramos solo los IDs que realmente existen en la DB
        const serviciosExistentes = await db.servicios.findMany({
          where: { id_servicios: { in: sIds } },
          select: { id_servicios: true }
        });
        const rExistentes = await db.restricciones.findMany({
          where: { id_restriccion: { in: rIds } },
          select: { id_restriccion: true }
        });

        const filteredSIds = serviciosExistentes.map(s => s.id_servicios);
        const filteredRIds = rExistentes.map(r => r.id_restriccion);

        console.log("[Inmuebles] IDs validados para conectar:", { 
          servicios: filteredSIds, 
          restricciones: filteredRIds 
        });

        // Procesar imágenes
        const mediaPaths: string[] = [];
        const housesDir = "./uploads/houses";
        if (!existsSync(housesDir)) mkdirSync(housesDir, { recursive: true });

        const files = imagenes ? (Array.isArray(imagenes) ? imagenes : [imagenes]) : [];
        for (const file of files) {
          if (file instanceof File) {
            const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
            await Bun.write(`${housesDir}/${fileName}`, file);
            mediaPaths.push(`/public/houses/${fileName}`);
          }
        }

        console.log("[Inmuebles] Guardando en DB...");
        const nuevo = await db.inmueble.create({
          data: {
            titulo: titulo || "Sin título",
            precio_mensual: precio,
            descripcion: descripcion || "",
            direccion_latitud: isNaN(lat) ? null : lat,
            direccion_longitud: isNaN(lng) ? null : lng,
            tipo_inmueble: tipoFinal,
            id_arrendador: authenticatedUser.id_usuario,
            servicios: filteredSIds.length ? { connect: filteredSIds.map(id => ({ id_servicios: id })) } : undefined,
            restricciones: filteredRIds.length ? { connect: filteredRIds.map(id => ({ id_restriccion: id })) } : undefined,
            imagenes: mediaPaths.length ? { create: mediaPaths.map(p => ({ imagen: p })) } : undefined,
          }
        });

        console.log("[Inmuebles] ¡Éxito! ID:", nuevo.id_inmueble);
        set.status = 201;
        return nuevo;

      } catch (error: any) {
        console.error("[Inmuebles] ERROR FATAL:", error);
        set.status = 500;
        return { error: "Error al crear inmueble", details: error.message };
      }
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