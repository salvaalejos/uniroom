import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "../db";

export const authPlugin = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .derive({ as: 'global' }, async ({ jwt, headers: { authorization }, set }) => {
    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      return { authenticatedUser: { error: "No autorizado" } as any };
    }
    const token = authorization.slice(7);
    let payload: any;
    try {
      payload = await jwt.verify(token);
    } catch {
      set.status = 401;
      return { authenticatedUser: { error: "Token inválido" } as any };
    }
    if (!payload || !payload.sub) {
      set.status = 401;
      return { authenticatedUser: { error: "Token inválido" } as any };
    }
    const user = await db.usuario.findUnique({
      where: { id_usuario: payload.sub as string },
    });
    if (!user) {
      set.status = 401;
      return { authenticatedUser: { error: "Usuario no encontrado" } as any };
    }
    return { authenticatedUser: user };
  });
