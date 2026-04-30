import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";
import { notificacionRoutes } from "./routes/notificacion";
import { filtroRoutes } from "./routes/Filtro";


const app = new Elysia()    
.use(cors({
    origin: '*' // El asterisco significa "Aceptar peticiones de CUALQUIER lado"
  }))
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .use(authRoutes)
  .use(usersRoutes)
  .use(notificacionRoutes)
  .use(filtroRoutes)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
