import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";
import { sendOTPEmail } from "../lib/email";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateExpiryMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

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
  // ── OAuth: Generar URL de vinculación de Mercado Pago ──
  .get("/oauth/url", async ({ authenticatedUser }) => {
    const clientId = process.env.MP_APP_ID || "";
    const redirectUri = process.env.MP_REDIRECT_URI || "";
    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${authenticatedUser.id_usuario}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return { url };
  })
  // ── OAuth: Callback de Mercado Pago ──
  .get("/oauth/callback", async ({ query, set }) => {
    const { code, state } = query as { code?: string; state?: string };
    if (!code || !state) {
      set.status = 400;
      return "Faltan parámetros de autorización.";
    }

    const clientId = process.env.MP_APP_ID || "";
    const clientSecret = process.env.MP_CLIENT_SECRET || "";
    const redirectUri = process.env.MP_REDIRECT_URI || "";

    try {
      const response = await fetch("https://api.mercadopago.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Error OAuth MP:", data);
        set.status = 400;
        return "Error al vincular cuenta de Mercado Pago.";
      }

      await db.usuario.update({
        where: { id_usuario: state },
        data: {
          mp_access_token: data.access_token,
          mp_refresh_token: data.refresh_token,
          mp_public_key: data.public_key,
          mp_vendedor_id: String(data.user_id),
        },
      });

      // Página HTML simple de confirmación
      return new Response(
        `<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#DCEEFF">
          <div style="text-align:center;padding:40px;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.1)">
            <h1 style="color:#205EA6">✅ ¡Cuenta vinculada!</h1>
            <p style="color:#0F2C4F">Ya puedes cerrar esta ventana y regresar a UniRoom.</p>
          </div>
        </body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    } catch (error) {
      console.error("Error en OAuth callback:", error);
      set.status = 500;
      return "Error interno del servidor.";
    }
  })
  // ── Obtener datos de usuario ──
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
        fecha_creacion: true,
        mp_vendedor_id: true,
      },
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

      let emailChanged = false;

      // Si el email viene en el body y es distinto al actual
      if (body.email && body.email !== existingUser.email) {
        const emailInUse = await db.usuario.findUnique({
          where: { email: body.email }
        });
        if (emailInUse) {
          set.status = 400;
          return { error: "El email proporcionado ya está en uso" };
        }

        updateData.email_verificado = false;
        emailChanged = true;

        // Invalidar códigos anteriores y generar nuevo
        const otpCode = generateOTP();
        await db.verificacionEmail.updateMany({
          where: { email: body.email, used: false },
          data: { used: true },
        });

        await db.verificacionEmail.create({
          data: {
            email: body.email,
            codigo: otpCode,
            expiresAt: generateExpiryMinutes(10),
          },
        });

        // Enviar correo con código
        await sendOTPEmail(body.email, otpCode);
      }

      if (updateData.password) {
        updateData.password_hash = await Bun.password.hash(updateData.password);
        delete updateData.password;
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
          email_verificado: true,
          mp_vendedor_id: true,
        },
      });

      return {
        ...updatedUser,
        emailChanged,
      };
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
          password: t.Optional(t.String())
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
