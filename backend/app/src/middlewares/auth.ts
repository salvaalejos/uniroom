import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "../db";

export const authPlugin = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
      exp: "7d",
    })
  )
  .derive({ as: "global" }, async ({ jwt, headers: { authorization } }) => {
    if (!authorization?.startsWith("Bearer ")) {
      return { authenticatedUser: { error: "No autorizado" } as any };
    }
    const token = authorization.slice(7);
    let payload: any;
    try {
      payload = await jwt.verify(token);
    } catch {
      return { authenticatedUser: { error: "Token inválido o expirado" } as any };
    }
    if (!payload || !payload.sub) {
      return { authenticatedUser: { error: "Token inválido" } as any };
    }
    const user = await db.usuario.findUnique({
      where: { id_usuario: payload.sub as string },
    });
    if (!user) {
      return { authenticatedUser: { error: "Usuario no encontrado" } as any };
    }
    if (user.estado !== "ACTIVO") {
      return { authenticatedUser: { error: "La cuenta está suspendida" } as any };
    }
    return { authenticatedUser: user };
  });
