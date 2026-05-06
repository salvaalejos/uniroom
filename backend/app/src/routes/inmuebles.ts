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
    const { estado, tipo, arrendadorId, precioMax, servicios, restricciones, distanciaMax, calificacionMin } = query;
    console.log("[Inmuebles] GET / - Filtros:", { estado, tipo, arrendadorId, precioMax, servicios, restricciones, distanciaMax, calificacionMin });

    const where: any = {};
    if (estado) where.estado = estado;
    if (tipo) where.tipo_inmueble = tipo;

    // Si se pide un arrendador específico, filtramos por él
    if (arrendadorId) {
      where.id_arrendador = arrendadorId;
    }

    // Filtro por precio máximo
    if (precioMax) {
      const precio = parseFloat(precioMax);
      if (!isNaN(precio)) {
        where.precio_mensual = { lte: precio };
      }
    }

    // Filtro por servicios (coma-separado)
    if (servicios) {
      const serviciosArray = servicios.split(',').map(s => s.trim()).filter(s => s);
      if (serviciosArray.length > 0) {
        where.servicios = {
          some: {
            nombre: { in: serviciosArray }
          }
        };
      }
    }

    // Filtro por restricciones (coma-separado)
    if (restricciones) {
      const restriccionesArray = restricciones.split(',').map(r => r.trim()).filter(r => r);
      if (restriccionesArray.length > 0) {
        where.restricciones = {
          some: {
            nombre: { in: restriccionesArray }
          }
        };
      }
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
        calificaciones: { 
          take: 5,
          include: {
            estudiante: { select: { nombre: true, apellidos: true, foto: true } }
          }
        },
        estudianteAutorizado: { select: { id_usuario: true } },
      },
    });

    // Log para depuración
    if (inmuebles.length > 0) {
        console.log("[Inmuebles] Ejemplo de arrendador:", JSON.stringify(inmuebles[0].arrendador));
    }

    // Filtro por distancia (post-query, usando fórmula de Haversine)
    let resultadosFiltrados = inmuebles;
    if (distanciaMax) {
      const distMax = parseFloat(distanciaMax);
      if (!isNaN(distMax)) {
        const TEC_LAT = 19.721869;
        const TEC_LNG = -101.185483;

        resultadosFiltrados = resultadosFiltrados.filter(inm => {
          const lat = Number(inm.direccion_latitud);
          const lng = Number(inm.direccion_longitud);
          if (isNaN(lat) || isNaN(lng)) return false;

          const R = 6371;
          const dLat = (lat - TEC_LAT) * Math.PI / 180;
          const dLon = (lng - TEC_LNG) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(TEC_LAT * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distancia = R * c;

          return distancia <= distMax;
        });
      }
    }

    // Filtro por calificación mínima (post-query)
    if (calificacionMin) {
      const calMin = parseFloat(calificacionMin);
      if (!isNaN(calMin)) {
        resultadosFiltrados = resultadosFiltrados.filter(inm => {
          if (!inm.calificaciones || inm.calificaciones.length === 0) return false;
          const promedio = inm.calificaciones.reduce((acc, c) => acc + c.calificacion, 0) / inm.calificaciones.length;
          return promedio >= calMin;
        });
      }
    }

    // Verificar si el usuario autenticado está rentando actualmente cualquier inmueble
    let usuarioActualmenteRentando = false;
    if (authenticatedUser) {
      const rentaActiva = await db.inmueble.findFirst({
        where: {
          id_estudiante: authenticatedUser.id_usuario,
          estado: "OCUPADO",
        },
      });
      usuarioActualmenteRentando = !!rentaActiva;
    }

    // Agregar info de autorización para cada inmueble
    const resultados = resultadosFiltrados.map((inm) => {
      const result: any = { ...inm };
      result.id_estudiante_autorizado = inm.estudianteAutorizado?.id_usuario || null;
      result.puede_rentar = authenticatedUser
        ? inm.id_estudiante_autorizado === authenticatedUser.id_usuario
        : false;
      result.usuario_actualmente_rentando = usuarioActualmenteRentando;
      delete result.estudianteAutorizado;
      return result;
    });

    console.log(`[Inmuebles] GET / - Encontrados: ${resultados.length}`);
    return resultados;
  }, {
    query: t.Object({
      estado: t.Optional(t.Union([t.Literal("DISPONIBLE"), t.Literal("OCUPADO"), t.Literal("OCULTO")])),
      tipo: t.Optional(t.Union([t.Literal("CASA"), t.Literal("DEPA"), t.Literal("CUARTO")])),
      arrendadorId: t.Optional(t.String()),
      precioMax: t.Optional(t.String()),
      servicios: t.Optional(t.String()),
      restricciones: t.Optional(t.String()),
      distanciaMax: t.Optional(t.String()),
      calificacionMin: t.Optional(t.String()),
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
        calificaciones: { include: { estudiante: { select: { nombre: true, apellidos: true, foto: true } } } },
        estudianteAutorizado: { select: { id_usuario: true, nombre: true, apellidos: true } },
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
    // Verificar si el usuario autenticado (estudiante) tiene una cita aprobada para rentar
    let puede_rentar = false;
    if (authenticatedUser && authenticatedUser.rol === "ESTUDIANTE") {
      const citaAprobada = await db.cita.findFirst({
        where: {
          id_inmueble: parseInt(id),
          id_estudiante: authenticatedUser.id_usuario,
          estado_renta: "APROBADO"
        }
      });
      if (citaAprobada) {
        puede_rentar = true;
      }
    }
    
    // Verificar si el usuario autenticado está rentando actualmente
    let usuarioActualmenteRentando = false;
    if (authenticatedUser) {
      const rentaActiva = await db.inmueble.findFirst({
        where: {
          id_estudiante: authenticatedUser.id_usuario,
          estado: "OCUPADO",
        },
      });
      usuarioActualmenteRentando = !!rentaActiva;
    }

    // Agregar info de autorización para el frontend
    const result: any = {
      ...inmueble,
      id_estudiante_autorizado: inmueble.estudianteAutorizado?.id_usuario || null,
      estudiante_autorizado_nombre: inmueble.estudianteAutorizado
        ? `${inmueble.estudianteAutorizado.nombre} ${inmueble.estudianteAutorizado.apellidos}`
        : null,
      puede_rentar: authenticatedUser
        ? inmueble.id_estudiante_autorizado === authenticatedUser.id_usuario
        : false,
      usuario_actualmente_rentando: usuarioActualmenteRentando,
    };
    // Remover el objeto completo para no duplicar
    delete result.estudianteAutorizado;
    
    // Si no está oculto, cualquier usuario autenticado (estudiante o arrendador) lo puede ver
    return { ...result, puede_rentar };
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

        if (authenticatedUser.rol === "ARRENDADOR" && !authenticatedUser.mp_access_token) {
          set.status = 400;
          return { error: "Necesitas vincular tu cuenta de Mercado Pago en tu perfil antes de publicar un inmueble." };
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
