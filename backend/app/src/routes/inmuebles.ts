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
    console.log("[Inmuebles] GET / - Filtros:", { estado, tipo, arrendadorId });

    const where: any = {};
    if (estado) where.estado = estado;
    if (tipo) where.tipo_inmueble = tipo;
    
    // Si se pide un arrendador específico, filtramos por él
    if (arrendadorId) {
      where.id_arrendador = arrendadorId;
    }

    // Lógica de visibilidad:
    // Si NO se está filtrando por un arrendador específico, solo mostramos los DISPONIBLES
    // a menos que sea ADMIN.
    if (!arrendadorId) {
        const isAdmin = authenticatedUser?.rol === "ADMIN";
        if (!authenticatedUser || !isAdmin) {
            where.estado = "DISPONIBLE";
        }
    }

    const inmuebles = await db.inmueble.findMany({
      where,
      include: {
        arrendador: { select: { nombre: true, apellidos: true, numero_contacto: true, foto: true } },
        servicios: true,
        restricciones: true,
        imagenes: true,
        disponibilidad: true,
        calificaciones: { take: 5 },
      },
    });
    
    // Log para depuración
    if (inmuebles.length > 0) {
        console.log("[Inmuebles] Ejemplo de arrendador:", JSON.stringify(inmuebles[0].arrendador));
    }
    
    console.log(`[Inmuebles] GET / - Encontrados: ${inmuebles.length}`);
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
        arrendador: { select: { nombre: true, apellidos: true, numero_contacto: true, foto: true } },
        servicios: true,
        restricciones: true,
        imagenes: true,
        disponibilidad: true,
        calificaciones: { include: { estudiante: { select: { nombre: true, apellidos: true } } } },
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
    
    // Si no está oculto, cualquier usuario autenticado (estudiante o arrendador) lo puede ver
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

        const { titulo, precio_mensual, descripcion, direccion_latitud, direccion_longitud, tipo_inmueble, servicios, restricciones, imagenes, horariosVisita } = body as any;

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
        let hVisita: any[] = [];
        try {
          if (servicios) sIds = typeof servicios === 'string' ? JSON.parse(servicios) : servicios;
          if (restricciones) rIds = typeof restricciones === 'string' ? JSON.parse(restricciones) : restricciones;
          if (horariosVisita) hVisita = typeof horariosVisita === 'string' ? JSON.parse(horariosVisita) : horariosVisita;
        } catch (e) {
          console.warn("[Inmuebles] Error parseando servicios/restricciones/horarios");
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

        // Procesar imágenes y videos
        const mediaPaths: string[] = [];
        const housesDir = "./uploads/houses";
        if (!existsSync(housesDir)) mkdirSync(housesDir, { recursive: true });

        const files = imagenes ? (Array.isArray(imagenes) ? imagenes : [imagenes]) : [];
        for (const file of files) {
          if (file instanceof File) {
            const extension = file.name.split('.').pop() || 'file';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
            console.log(`[Inmuebles] Escribiendo archivo (${file.type}):`, fileName);
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
            disponibilidad: hVisita.length ? {
                create: hVisita.map(h => ({
                    fecha: h.fecha,
                    horas: h.horas
                }))
            } : undefined
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
      console.log(`=== PETICION RECIBIDA: PUT /inmuebles/${id} ===`);
      try {
        if (!authenticatedUser) {
          set.status = 401;
          return { error: "No autenticado" };
        }

        const idNum = parseInt(id);
        const inmueble = await db.inmueble.findUnique({
          where: { id_inmueble: idNum },
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

        const { titulo, precio_mensual, descripcion, direccion_latitud, direccion_longitud, tipo_inmueble, servicios, restricciones, imagenes, ids_borrados, horariosVisita } = body as any;

        const updateData: any = {};
        
        // Manejo de eliminación de imágenes existentes
        if (ids_borrados) {
          const idsABorrar: number[] = typeof ids_borrados === 'string' ? JSON.parse(ids_borrados) : ids_borrados;
          if (idsABorrar.length > 0) {
            console.log("[Inmuebles] Eliminando imágenes antiguas:", idsABorrar);
            await db.imagenes.deleteMany({
              where: { id_imagen: { in: idsABorrar } }
            });
          }
        }
        
        if (titulo !== undefined) updateData.titulo = titulo || "Sin título";
        if (precio_mensual !== undefined) {
          const precio = parseFloat(precio_mensual);
          if (!isNaN(precio)) updateData.precio_mensual = precio;
        }
        if (descripcion !== undefined) updateData.descripcion = descripcion || "";
        if (direccion_latitud !== undefined) updateData.direccion_latitud = parseFloat(direccion_latitud) || null;
        if (direccion_longitud !== undefined) updateData.direccion_longitud = parseFloat(direccion_longitud) || null;
        
        if (tipo_inmueble !== undefined) {
          let tipoFinal = tipo_inmueble;
          if (tipoFinal === "Departamento") tipoFinal = "DEPA";
          else if (tipoFinal === "Casa") tipoFinal = "CASA";
          else if (tipoFinal === "Cuarto") tipoFinal = "CUARTO";
          else if (!["CASA", "DEPA", "CUARTO"].includes(tipoFinal)) tipoFinal = "CUARTO";
          updateData.tipo_inmueble = tipoFinal;
        }

        // Actualizar servicios y restricciones
        if (servicios !== undefined) {
          let sIds: number[] = typeof servicios === 'string' ? JSON.parse(servicios) : servicios;
          const existS = await db.servicios.findMany({ where: { id_servicios: { in: sIds } }, select: { id_servicios: true } });
          updateData.servicios = { set: existS.map(s => ({ id_servicios: s.id_servicios })) };
        }

        if (restricciones !== undefined) {
          let rIds: number[] = typeof restricciones === 'string' ? JSON.parse(restricciones) : restricciones;
          const existR = await db.restricciones.findMany({ where: { id_restriccion: { in: rIds } }, select: { id_restriccion: true } });
          updateData.restricciones = { set: existR.map(r => ({ id_restriccion: r.id_restriccion })) };
        }

        // Actualizar disponibilidad
        if (horariosVisita !== undefined) {
            let hVisita: any[] = typeof horariosVisita === 'string' ? JSON.parse(horariosVisita) : horariosVisita;
            // Borramos los anteriores
            await db.disponibilidad.deleteMany({ where: { id_inmueble: idNum } });
            // Creamos los nuevos
            if (hVisita.length > 0) {
                updateData.disponibilidad = {
                    create: hVisita.map(h => ({
                        fecha: h.fecha,
                        horas: h.horas
                    }))
                };
            }
        }

        // Manejo de nuevas imágenes y videos
        if (imagenes !== undefined) {
          const mediaPaths: string[] = [];
          const housesDir = "./uploads/houses";
          if (!existsSync(housesDir)) mkdirSync(housesDir, { recursive: true });

          const files = Array.isArray(imagenes) ? imagenes : [imagenes];
          for (const file of files) {
            if (file instanceof File) {
              const extension = file.name.split('.').pop() || 'file';
              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
              console.log(`[Inmuebles] Escribiendo nuevo archivo (${file.type}):`, fileName);
              await Bun.write(`${housesDir}/${fileName}`, file);
              mediaPaths.push(`/public/houses/${fileName}`);
            }
          }

          if (mediaPaths.length > 0) {
            updateData.imagenes = { create: mediaPaths.map(p => ({ imagen: p })) };
          }
        }

        const inmuebleActualizado = await db.inmueble.update({
          where: { id_inmueble: idNum },
          data: updateData,
          include: { servicios: true, restricciones: true, imagenes: true, disponibilidad: true },
        });

        console.log(`[Inmuebles] ¡Actualizado! ID: ${id}`);
        return inmuebleActualizado;

      } catch (error: any) {
        console.error("[Inmuebles] ERROR FATAL EN UPDATE:", error);
        set.status = 500;
        return { error: "Error al actualizar inmueble", details: error.message };
      }
    }
  )

  // 5. Eliminar un inmueble permanentemente de la BD
  .delete("/:id", async ({ params: { id }, authenticatedUser, set }) => {
    console.log(`=== PETICION RECIBIDA: DELETE /inmuebles/${id} ===`);
    try {
      if (!authenticatedUser) {
        set.status = 401;
        return { error: "No autenticado" };
      }

      const id_num = parseInt(id);
      const inmueble = await db.inmueble.findUnique({
        where: { id_inmueble: id_num },
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

      // ELIMINACIÓN PERMANENTE (Hard Delete)
      // Usamos una transacción para borrar todo lo relacionado primero
      await db.$transaction([
        // 1. Borrar imágenes
        db.imagenes.deleteMany({ where: { id_inmueble: id_num } }),
        // 2. Borrar calificaciones
        db.calificacion.deleteMany({ where: { id_inmueble: id_num } }),
        // 3. Borrar citas
        db.cita.deleteMany({ where: { id_inmueble: id_num } }),
        // 4. Finalmente, borrar el inmueble
        db.inmueble.delete({ where: { id_inmueble: id_num } })
      ]);

      console.log(`[Inmuebles] ELIMINACIÓN TOTAL: ID ${id}`);
      return { message: "Inmueble y todos sus datos relacionados eliminados permanentemente" };

    } catch (error: any) {
      console.error("[Inmuebles] ERROR FATAL EN DELETE:", error);
      set.status = 500;
      return { error: "Error al eliminar el inmueble permanentemente", details: error.message };
    }
  });
