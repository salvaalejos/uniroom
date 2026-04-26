import { Elysia, t } from "elysia";
import { db } from "../db";
import jwt from "@elysiajs/jwt";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      console.log("[register] body recibido:", JSON.stringify(body));

      // Validar formato de email manualmente
      if (!EMAIL_REGEX.test(body.email)) {
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

      // Crear el nuevo usuario
      const newUser = await db.usuario.create({
        data: {
          email: body.email,
          password_hash,
          nombre: body.nombre,
          apellidos: body.apellidos,
          rol: body.rol,
          foto: fotoPath
        },
      });

      const { password_hash: _, ...userWithoutPassword } = newUser;

      set.status = 201;
      return userWithoutPassword;
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String({ minLength: 6 }),
        nombre: t.String(),
        apellidos: t.String(),
        rol: t.Union([t.Literal("ESTUDIANTE"), t.Literal("ARRENDADOR")]),
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
  );
