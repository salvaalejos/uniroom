import { Elysia, t } from "elysia";
import { db } from "../db";
import { jwt } from "@elysiajs/jwt";
import { randomInt } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { sendOTPEmail, sendForgotPasswordEmail } from "../lib/email";
import {
  validarEmail,
  validarNombreCompleto,
  validarTelefono,
  validarPassword,
  sanitizarTexto,
  sanitizarNombreArchivo,
} from "../utils/validation";
import {
  checkRateLimit,
  registerOtpAttempt,
  resetOtpAttempts,
} from "../middlewares/rateLimiter";

function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}

function generateExpiryMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
      exp: "7d",
    })
  )
  .post(
    "/register",
    async ({ body, set, headers }) => {
      const clientIp = headers["x-forwarded-for"] || headers["x-real-ip"] || "local";
      const rate = checkRateLimit(`register:${clientIp}`, 10, 15 * 60 * 1000);
      if (!rate.allowed) {
        set.status = 429;
        return {
          error: `Demasiados intentos de registro. Intenta de nuevo en ${rate.retryAfterSeconds} segundos.`,
        };
      }

      const email = body.email.trim().toLowerCase();
      const nombre = sanitizarTexto(body.nombre, 100).replace(/\s+/g, " ");
      const apellidos = sanitizarTexto(body.apellidos, 100).replace(/\s+/g, " ");
      const telefono = body.numero_contacto ? body.numero_contacto.trim().replace(/[\s-]/g, "") : "";

      // 1. Validar correo electrónico
      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      // 2. Validar nombre y apellidos
      const nombreCheck = validarNombreCompleto(nombre, apellidos);
      if (!nombreCheck.valido) {
        set.status = 400;
        return { error: nombreCheck.error, field: "fullName" };
      }

      // 3. Validar teléfono obligatorio
      const telCheck = validarTelefono(telefono);
      if (!telCheck.valido) {
        set.status = 400;
        return { error: telCheck.error, field: "phone" };
      }

      // 4. Validar fortaleza de contraseña
      const passCheck = validarPassword(body.password, { email, nombre });
      if (!passCheck.valido) {
        set.status = 400;
        return { error: passCheck.error, field: "password" };
      }

      // 5. Verificar si el email ya existe
      const existingUser = await db.usuario.findUnique({
        where: { email },
      });

      if (existingUser) {
        set.status = 400;
        return { error: "Este correo electrónico ya está registrado", field: "email" };
      }

      let fotoPath: string | null = null;
      if (body.foto) {
        if (!existsSync("./uploads")) {
          mkdirSync("./uploads", { recursive: true });
        }
        const safeName = sanitizarNombreArchivo(body.foto.name);
        const fileName = `${Date.now()}-${safeName}`;
        const destination = `./uploads/${fileName}`;

        await Bun.write(destination, body.foto);
        fotoPath = `/public/${fileName}`;
      }

      const password_hash = await Bun.password.hash(body.password, {
        algorithm: "bcrypt",
        cost: 10,
      });

      const newUser = await db.usuario.create({
        data: {
          email,
          password_hash,
          nombre,
          apellidos,
          rol: body.rol,
          numero_contacto: telefono,
          genero: body.genero,
          foto: fotoPath,
          email_verificado: false,
        },
      });

      // Invalidar códigos previos si existieran y crear el nuevo OTP real de 6 dígitos
      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });

      const emailResult = await sendOTPEmail(email, otpCode);
      if (!emailResult.success) {
        console.error(`[Auth] Falló el envío del correo OTP a ${email}: ${emailResult.error}`);
      }

      const { password_hash: _, ...userWithoutPassword } = newUser;

      set.status = 201;
      return {
        message: "Cuenta creada exitosamente. Hemos enviado un código de 6 dígitos a tu correo.",
        user: userWithoutPassword,
        pendingVerification: true,
        emailSent: emailResult.success,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String({ minLength: 8, maxLength: 128 }),
        nombre: t.String({ minLength: 2, maxLength: 100 }),
        apellidos: t.String({ minLength: 2, maxLength: 100 }),
        rol: t.Union([t.Literal("ESTUDIANTE"), t.Literal("ARRENDADOR")]),
        numero_contacto: t.Optional(t.String()),
        genero: t.Optional(
          t.Union([t.Literal("MASCULINO"), t.Literal("FEMENINO"), t.Literal("OTRO")])
        ),
        foto: t.Optional(
          t.File({
            type: ["image/jpeg", "image/png", "image/jpg"],
            maxSize: "5m",
          })
        ),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, set, jwt, headers }) => {
      const email = body.email.trim().toLowerCase();

      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      if (!body.password || body.password.length < 6 || body.password.length > 128) {
        set.status = 400;
        return {
          error: "La contraseña debe tener entre 6 y 128 caracteres",
          field: "password",
        };
      }

      const clientIp = headers["x-forwarded-for"] || headers["x-real-ip"] || "local";
      const rate = checkRateLimit(`login:${clientIp}:${email}`, 10, 15 * 60 * 1000);
      if (!rate.allowed) {
        set.status = 429;
        return {
          error: `Demasiados intentos de inicio de sesión. Espera ${rate.retryAfterSeconds} segundos.`,
        };
      }

      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 401;
        return { error: "Correo o contraseña incorrectos", field: "credentials" };
      }

      const isValid = await Bun.password.verify(body.password, user.password_hash);

      if (!isValid) {
        set.status = 401;
        return { error: "Correo o contraseña incorrectos", field: "credentials" };
      }

      if (user.estado !== "ACTIVO") {
        set.status = 403;
        return { error: "Esta cuenta se encuentra suspendida o inactiva" };
      }

      // Si el correo aún no está verificado, enviamos un nuevo código OTP real y redirigimos a verificación
      if (!user.email_verificado) {
        const otpRate = checkRateLimit(`otp:${email}`, 3, 5 * 60 * 1000);
        if (otpRate.allowed) {
          await db.verificacionEmail.updateMany({
            where: { email, used: false },
            data: { used: true },
          });
          const otpCode = generateOTP();
          await db.verificacionEmail.create({
            data: {
              email,
              codigo: otpCode,
              expiresAt: generateExpiryMinutes(10),
            },
          });
          await sendOTPEmail(email, otpCode);
        }
        return { needsVerification: true, email: user.email };
      }

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
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post(
    "/request-otp",
    async ({ body, set }) => {
      const email = body.email.trim().toLowerCase();

      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      const rate = checkRateLimit(`otp:${email}`, 3, 5 * 60 * 1000);
      if (!rate.allowed) {
        set.status = 429;
        return {
          error: `Has solicitado demasiados códigos. Espera ${rate.retryAfterSeconds} segundos.`,
        };
      }

      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 404;
        return { error: "No existe una cuenta asociada a este correo", field: "email" };
      }

      if (user.email_verificado) {
        set.status = 400;
        return { error: "El correo electrónico ya está verificado" };
      }

      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });
      resetOtpAttempts(email);

      const emailResult = await sendOTPEmail(email, otpCode);
      if (!emailResult.success) {
        set.status = 500;
        return {
          error: emailResult.error || "No se pudo enviar el correo de verificación",
        };
      }

      return { message: "Código de 6 dígitos enviado a tu correo electrónico" };
    },
    {
      body: t.Object({
        email: t.String(),
      }),
    }
  )
  .post(
    "/verify-otp",
    async ({ body, set, jwt }) => {
      const email = body.email.trim().toLowerCase();
      const codigo = body.codigo.trim();

      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      if (!/^\d{6}$/.test(codigo)) {
        set.status = 400;
        return { error: "El código de verificación debe tener 6 dígitos numéricos", field: "otp" };
      }

      const attempt = registerOtpAttempt(email);
      if (!attempt.allowed) {
        await db.verificacionEmail.updateMany({
          where: { email, used: false },
          data: { used: true },
        });
        set.status = 429;
        return {
          error: "Demasiados intentos fallidos. Por seguridad el código fue invalidado; solicita uno nuevo.",
          field: "otp",
        };
      }

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
        return {
          error: `Código inválido o expirado. Te quedan ${attempt.remainingAttempts} intentos.`,
          field: "otp",
        };
      }

      await db.verificacionEmail.update({
        where: { id: verificacion.id },
        data: { used: true },
      });
      resetOtpAttempts(email);

      const user = await db.usuario.update({
        where: { email },
        data: { email_verificado: true },
      });

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
        email: t.String(),
        codigo: t.String({ minLength: 6, maxLength: 6 }),
      }),
    }
  )
  .post(
    "/resend-otp",
    async ({ body, set }) => {
      const email = body.email.trim().toLowerCase();

      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      const rate = checkRateLimit(`otp:${email}`, 3, 5 * 60 * 1000);
      if (!rate.allowed) {
        set.status = 429;
        return {
          error: `Por favor espera ${rate.retryAfterSeconds} segundos antes de solicitar otro código.`,
        };
      }

      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 404;
        return { error: "Usuario no encontrado", field: "email" };
      }

      if (user.email_verificado) {
        set.status = 400;
        return { error: "El correo electrónico ya está verificado" };
      }

      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });
      resetOtpAttempts(email);

      const emailResult = await sendOTPEmail(email, otpCode);
      if (!emailResult.success) {
        set.status = 500;
        return {
          error: emailResult.error || "No se pudo reenviar el correo de verificación",
        };
      }

      return { message: "Nuevo código de 6 dígitos enviado a tu correo" };
    },
    {
      body: t.Object({
        email: t.String(),
      }),
    }
  )
  .post(
    "/forgot-password-otp",
    async ({ body, set }) => {
      const email = body.email.trim().toLowerCase();

      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      const rate = checkRateLimit(`forgot:${email}`, 3, 5 * 60 * 1000);
      if (!rate.allowed) {
        set.status = 429;
        return {
          error: `Has solicitado demasiados códigos. Intenta de nuevo en ${rate.retryAfterSeconds} segundos.`,
        };
      }

      const user = await db.usuario.findUnique({
        where: { email },
      });

      if (!user) {
        set.status = 404;
        return { error: "No encontramos una cuenta registrada con ese correo electrónico", field: "email" };
      }

      if (user.estado !== "ACTIVO") {
        set.status = 403;
        return { error: "Esta cuenta se encuentra suspendida", field: "email" };
      }

      await db.verificacionEmail.updateMany({
        where: { email, used: false },
        data: { used: true },
      });

      const otpCode = generateOTP();
      await db.verificacionEmail.create({
        data: {
          email,
          codigo: otpCode,
          expiresAt: generateExpiryMinutes(10),
        },
      });
      resetOtpAttempts(email);

      const emailResult = await sendForgotPasswordEmail(email, otpCode);
      if (!emailResult.success) {
        set.status = 500;
        return {
          error: emailResult.error || "No se pudo enviar el correo de recuperación",
        };
      }

      return { message: "Código de recuperación de 6 dígitos enviado a tu correo" };
    },
    {
      body: t.Object({
        email: t.String(),
      }),
    }
  )
  .post(
    "/reset-password",
    async ({ body, set }) => {
      const email = body.email.trim().toLowerCase();
      const codigo = body.codigo.trim();
      const { newPassword } = body;

      const emailCheck = validarEmail(email);
      if (!emailCheck.valido) {
        set.status = 400;
        return { error: emailCheck.error, field: "email" };
      }

      if (!/^\d{6}$/.test(codigo)) {
        set.status = 400;
        return { error: "El código de recuperación debe tener 6 dígitos numéricos", field: "otp" };
      }

      const user = await db.usuario.findUnique({ where: { email } });
      if (!user) {
        set.status = 404;
        return { error: "Usuario no encontrado", field: "email" };
      }

      const passCheck = validarPassword(newPassword, { email, nombre: user.nombre });
      if (!passCheck.valido) {
        set.status = 400;
        return { error: passCheck.error, field: "newPassword" };
      }

      const attempt = registerOtpAttempt(email);
      if (!attempt.allowed) {
        await db.verificacionEmail.updateMany({
          where: { email, used: false },
          data: { used: true },
        });
        set.status = 429;
        return {
          error: "Demasiados intentos fallidos. El código fue invalidado por seguridad; solicita uno nuevo.",
          field: "otp",
        };
      }

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
        return {
          error: `Código inválido o expirado. Te quedan ${attempt.remainingAttempts} intentos.`,
          field: "otp",
        };
      }

      await db.verificacionEmail.update({
        where: { id: verificacion.id },
        data: { used: true },
      });
      resetOtpAttempts(email);

      const password_hash = await Bun.password.hash(newPassword, {
        algorithm: "bcrypt",
        cost: 10,
      });

      await db.usuario.update({
        where: { email },
        data: { password_hash },
      });

      return { message: "Contraseña actualizada exitosamente" };
    },
    {
      body: t.Object({
        email: t.String(),
        codigo: t.String({ minLength: 6, maxLength: 6 }),
        newPassword: t.String({ minLength: 8, maxLength: 128 }),
      }),
    }
  );
