import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";
import { sendOTPEmail, sendForgotPasswordEmail } from "../lib/email";
import { esEmailValido } from "../utils/validation";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateExpiryMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .post(
    "/register",
    async ({ body, set }) => {
      // Validar formato de email
      if (!esEmailValido(body.email)) {
        set.status = 400;
        return { error: "El formato del correo electrónico no es válido" };
      }

      // Verificar si el email ya existe
      const existingUser = await db.usuario.findUnique({
        where: { email: body.email },
      });

      if (existingUser) {
        set.status = 400;
        return { error: "El email ya está registrado" };
      }

      let fotoPath: string | null = null;
      if (body.foto) {
        // Creamos un nombre único: timestamp + nombre original
        const fileName = `${Date.now()}-${body.foto.name}`;
        const destination = `./uploads/${fileName}`;

        // Guardamos físicamente en la carpeta uploads
        await Bun.write(destination, body.foto);
        
        // Guardamos la ruta relativa para la DB
        fotoPath = `/public/${fileName}`;
      }

      // Encriptar la contraseña usando Bun de manera nativa y rápida
      const password_hash = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 10,
      });

        // Crear el nuevo usuario (sin verificar email por defecto)
      const newUser = await db.usuario.create({
        data: {
          email: body.email,
          password_hash,
          nombre: body.nombre,
          apellidos: body.apellidos,
          rol: body.rol,
          numero_contacto: body.numero_contacto,
          genero: body.genero,
          foto: fotoPath,
          email_verificado: false
        },
      });

      // Generar y guardar código OTP
      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email: body.email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });

      // Enviar correo con código
      await sendOTPEmail(body.email, otpCode);

      const { password_hash: _, ...userWithoutPassword } = newUser;

      set.status = 201;
      return { 
        message: "Cuenta creada exitosamente. Por favor verifica tu correo.",
        user: userWithoutPassword,
        pendingVerification: true
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String({ minLength: 6 }),
        nombre: t.String(),
        apellidos: t.String(),
        rol: t.Union([t.Literal("ESTUDIANTE"), t.Literal("ARRENDADOR")]),
        numero_contacto: t.Optional(t.String()),
        genero: t.Optional(t.Union([t.Literal("MASCULINO"), t.Literal("FEMENINO"), t.Literal("OTRO")])),
        foto: t.Optional(t.File({
            type: ['image/jpeg', 'image/png', 'image/jpg'],
            maxSize: '5m' // Límite de 5MB por foto
        }))
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set, jwt }) => {
      const user = await db.usuario.findUnique({
        where: { email: body.email },
      });

      if (!user) {
        set.status = 401;
        return { error: "Credenciales inválidas" };
      }

      // Validar el hash con Bun
      const isValid = await Bun.password.verify(body.password, user.password_hash);

      if (!isValid) {
        set.status = 401;
        return { error: "Credenciales inválidas" };
      }

      if (user.estado !== "ACTIVO") {
        set.status = 403;
        return { error: "La cuenta no está activa" };
      }

      // Verificar si el email está verificado
      if (!user.email_verificado) {
        set.status = 403;
        return { needsVerification: true, email: user.email };
      }

      // Firmar token JWT
      const token = await jwt.sign({
        sub: user.id_usuario,
        rol: user.rol,
      });

      return {
        token,
        user: {
          id_usuario: user.id_usuario,
          email: user.email,
          nombre: user.nombre,
          apellidos: user.apellidos,
          rol: user.rol,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )
  .post(
    "/request-otp",
    async ({ body, set }) => {
      const { email } = body;

      // Verificar que el usuario existe
      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 404;
        return { error: "Usuario no encontrado" };
      }

      // Si ya está verificado, no tiene sentido solicitar OTP
      if (user.email_verificado) {
        set.status = 400;
        return { error: "El correo ya está verificado" };
      }

      // Invalidar códigos anteriores
      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      // Generar nuevo código
      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });

      // Enviar correo
      await sendOTPEmail(email, otpCode);

      return { message: "Código enviado a tu correo" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )
  .post(
    "/verify-otp",
    async ({ body, set, jwt }) => {
      const { email, codigo } = body;

      // Buscar código válido
      const verificacion = await db.verificacionEmail.findFirst({
        where: {
          email,
          codigo,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verificacion) {
        set.status = 400;
        return { error: "Código inválido o expirado" };
      }

      // Marcar código como usado
      await db.verificacionEmail.update({
        where: { id: verificacion.id },
        data: { used: true },
      });

      // Verificar usuario
      const user = await db.usuario.update({
        where: { email },
        data: { email_verificado: true },
      });

      // Generar token JWT
      const token = await jwt.sign({
        sub: user.id_usuario,
        rol: user.rol,
      });

      return {
        verified: true,
        token,
        user: {
          id_usuario: user.id_usuario,
          email: user.email,
          nombre: user.nombre,
          apellidos: user.apellidos,
          rol: user.rol,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        codigo: t.String({ minLength: 6, maxLength: 6 }),
      }),
    }
  )
  .post(
    "/resend-otp",
    async ({ body, set }) => {
      const { email } = body;

      // Verificar que el usuario existe
      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 404;
        return { error: "Usuario no encontrado" };
      }

      if (user.email_verificado) {
        set.status = 400;
        return { error: "El correo ya está verificado" };
      }

      // Invalidar códigos anteriores
      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      // Generar nuevo código
      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });

      // Enviar correo
      await sendOTPEmail(email, otpCode);

      return { message: "Nuevo código enviado" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )
  .post(
    "/forgot-password-otp",
    async ({ body, set }) => {
      const { email } = body;

      // Verificar que el usuario existe
      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 404;
        return { error: "Usuario no encontrado" };
      }

      // Invalidar códigos anteriores
      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      // Generar nuevo código
      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });

      // Enviar correo
      await sendForgotPasswordEmail(email, otpCode);

      return { message: "Código de recuperación enviado a tu correo" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
      }),
    }
  )
  .post(
    "/reset-password",
    async ({ body, set }) => {
      const { email, codigo, newPassword } = body;

      // Buscar código válido
      const verificacion = await db.verificacionEmail.findFirst({
        where: {
          email,
          codigo,
          used: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verificacion) {
        set.status = 400;
        return { error: "Código inválido o expirado" };
      }

      // Marcar código como usado
      await db.verificacionEmail.update({
        where: { id: verificacion.id },
        data: { used: true },
      });

      // Encriptar nueva contraseña
      const password_hash = await Bun.password.hash(newPassword, {
        algorithm: "bcrypt",
        cost: 10,
      });

      // Actualizar contraseña del usuario
      await db.usuario.update({
        where: { email },
        data: { password_hash },
      });

      return { message: "Contraseña actualizada exitosamente" };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        codigo: t.String({ minLength: 6, maxLength: 6 }),
        newPassword: t.String({ minLength: 6 }),
      }),
    }
  );
