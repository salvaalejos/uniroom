import { Elysia, t } from "elysia";
import { db } from "../db";
import jwt from "jsonwebtoken";

type AuthUser = {
  id_usuario?: string;
  sub?: string;
  rol?: string;
};

const getBearerToken = (authorization?: string) => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
};

const authenticateRequest = (
  headers: Record<string, string | undefined>,
  set: { status?: number }
) => {
  const token = getBearerToken(headers.authorization);
  const jwtSecret = process.env.JWT_SECRET || "super_secret_elysia_key";

  if (!token) {
    set.status = 401;
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret) as AuthUser;
  } catch (error) {
    console.error("JWT Verify Error:", error);
    set.status = 401;
    return null;
  }
};

const getAuthenticatedUserId = (authUser: AuthUser) =>
  authUser.id_usuario ?? authUser.sub ?? null;

const isAdmin = (authUser: AuthUser) => authUser.rol === "ADMIN";

const canManageInmueble = (authUser: AuthUser, inmuebleArrendadorId: string) => {
  const authenticatedUserId = getAuthenticatedUserId(authUser);
  return isAdmin(authUser) || authenticatedUserId === inmuebleArrendadorId;
};

export const inmueblesRoutes = new Elysia({ prefix: "/inmuebles" })
  // 1. Listar todos los inmuebles (público, pero se puede filtrar)
  .get("/", async ({ headers, set, query }) => {
    const authUser = authenticateRequest(headers, set);
    const { estado, tipo, arrendadorId } = query;

    const where: any = {};
    if (estado) where.estado = estado;
    if (tipo) where.tipo_inmueble = tipo;
    if (arrendadorId) where.id_arrendador = arrendadorId;

    // Si no es admin ni arrendador, solo mostrar DISPONIBLE
    if (!authUser || (!isAdmin(authUser) && !arrendadorId)) {
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
  .get("/:id", async ({ params: { id }, headers, set }) => {
    const authUser = authenticateRequest(headers, set);
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
      if (!authUser) {
        set.status = 401;
        return { error: "No autenticado" };
      }
      const userId = getAuthenticatedUserId(authUser);
      if (!isAdmin(authUser) && userId !== inmueble.id_arrendador) {
        set.status = 403;
        return { error: "No autorizado para ver este inmueble oculto" };
      }
    }

    return inmueble;
  })

  // 3. Crear un nuevo inmueble (solo arrendadores)
  .post(
    "/",
    async ({ body, headers, set }) => {
      const authUser = authenticateRequest(headers, set);
      if (!authUser) {
        return { error: "No autenticado" };
      }
      const userId = getAuthenticatedUserId(authUser);
      if (!userId) {
        set.status = 401;
        return { error: "Usuario no identificado" };
      }
      const user = await db.usuario.findUnique({ where: { id_usuario: userId } });
      if (!user || user.rol !== "ARRENDADOR") {
        set.status = 403;
        return { error: "Solo los arrendadores pueden crear inmuebles" };
      }

      const { precio_mensual, descripcion, direccion_latitud, direccion_longitud, tipo_inmueble, servicios, restricciones, imagenes } = body;

      const nuevoInmueble = await db.inmueble.create({
        data: {
          precio_mensual,
          descripcion,
          direccion_latitud: direccion_latitud ? parseFloat(direccion_latitud) : null,
          direccion_longitud: direccion_longitud ? parseFloat(direccion_longitud) : null,
          tipo_inmueble,
          id_arrendador: userId,
          servicios: servicios?.length ? { connect: servicios.map(id => ({ id_servicios: id })) } : undefined,
          restricciones: restricciones?.length ? { connect: restricciones.map(id => ({ id_restriccion: id })) } : undefined,
          imagenes: imagenes?.length ? { create: imagenes.map(img => ({ imagen: img })) } : undefined,
        },
        include: { servicios: true, restricciones: true, imagenes: true },
      });
      set.status = 201;
      return nuevoInmueble;
    },
    {
      body: t.Object({
        precio_mensual: t.Number(),
        descripcion: t.Optional(t.String()),
        direccion_latitud: t.Optional(t.String()),
        direccion_longitud: t.Optional(t.String()),
        tipo_inmueble: t.Union([t.Literal("CASA"), t.Literal("DEPA"), t.Literal("CUARTO")]),
        servicios: t.Optional(t.Array(t.Number())),
        restricciones: t.Optional(t.Array(t.Number())),
        imagenes: t.Optional(t.Array(t.String())),
      }),
    }
  )

  // 4. Actualizar un inmueble (solo arrendador dueño o admin)
  .put(
    "/:id",
    async ({ params: { id }, body, headers, set }) => {
      const authUser = authenticateRequest(headers, set);
      if (!authUser) {
        return { error: "No autenticado" };
      }
      const userId = getAuthenticatedUserId(authUser);
      const inmueble = await db.inmueble.findUnique({
        where: { id_inmueble: parseInt(id) },
      });
      if (!inmueble) {
        set.status = 404;
        return { error: "Inmueble no encontrado" };
      }
      if (!canManageInmueble(authUser, inmueble.id_arrendador)) {
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
  .delete("/:id", async ({ params: { id }, headers, set }) => {
    const authUser = authenticateRequest(headers, set);
    if (!authUser) {
      return { error: "No autenticado" };
    }
    const inmueble = await db.inmueble.findUnique({
      where: { id_inmueble: parseInt(id) },
    });
    if (!inmueble) {
      set.status = 404;
      return { error: "Inmueble no encontrado" };
    }
    if (!canManageInmueble(authUser, inmueble.id_arrendador)) {
      set.status = 403;
      return { error: "No autorizado para eliminar este inmueble" };
    }

    const inmuebleOculto = await db.inmueble.update({
      where: { id_inmueble: parseInt(id) },
      data: { estado: "OCULTO" },
    });
    return { message: "Inmueble ocultado correctamente", inmueble: inmuebleOculto };
  });