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
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    set.status = 401;
    return null;
  }

  try {
    return jwt.verify(token, jwtSecret) as AuthUser;
  } catch {
    set.status = 401;
    return null;
  }
};

const getAuthenticatedUserId = (authUser: AuthUser) =>
  authUser.id_usuario ?? authUser.sub ?? null;

const isAdmin = (authUser: AuthUser) => authUser.rol === "ADMIN";

const canAccessUser = (authUser: AuthUser, userId: string) => {
  const authenticatedUserId = getAuthenticatedUserId(authUser);
  return isAdmin(authUser) || authenticatedUserId === userId;
};

export const usersRoutes = new Elysia({ prefix: "/users" })
  .get("/", async ({ headers, set }) => {
    const authUser = authenticateRequest(headers, set);
    if (!authUser) {
      return { error: "No autenticado" };
    }

    if (!isAdmin(authUser)) {
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
  .get("/:id", async ({ params: { id }, headers, set }) => {
    const authUser = authenticateRequest(headers, set);
    if (!authUser) {
      return { error: "No autenticado" };
    }

    if (!canAccessUser(authUser, id)) {
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
    async ({ params: { id }, body, headers, set }) => {
      const authUser = authenticateRequest(headers, set);
      if (!authUser) {
        return { error: "No autenticado" };
      }

      if (!canAccessUser(authUser, id)) {
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
          edad: t.Number(),
          foto: t.String(),
          visibilidad: t.Boolean(),
        })
      ),
    }
  )
  .delete("/:id", async ({ params: { id }, headers, set }) => {
    const authUser = authenticateRequest(headers, set);
    if (!authUser) {
      return { error: "No autenticado" };
    }

    if (!canAccessUser(authUser, id)) {
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
