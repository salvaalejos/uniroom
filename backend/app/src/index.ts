import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";
import { paymentRoutes } from "./routes/payments";
import { citasRoutes } from "./routes/citas";
import { inmueblesRoutes } from "./routes/inmuebles"; // <-- agregar
import { filtroRoutes } from "./routes/Filtro";
import cors from "@elysiajs/cors";
import staticPlugin from "@elysiajs/static";
import { notificacionRoutes } from "./routes/notificacion"; 
const app = new Elysia()
  .use(staticPlugin({
        assets: 'uploads', //Carpeta
        prefix: '/public'  //URL externa lol
    }))
.use(cors({
    origin: '*' // El asterisco significa "Aceptar peticiones de CUALQUIER lado"
  }))
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .use(cors({ origin: 'http://localhost:8081' }))
  .use(authRoutes)
  .use(usersRoutes)
  .use(paymentRoutes)
  .use(notificacionRoutes)
  .use(citasRoutes)
  .use(inmueblesRoutes) // <-- agregar
  .use(filtroRoutes)
  .get("/", () => "Hello Elysia")
  .listen({ port: 3000, hostname: '0.0.0.0' });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
