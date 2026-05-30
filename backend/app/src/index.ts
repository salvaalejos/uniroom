import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";
import { paymentRoutes } from "./routes/payments";
import { citasRoutes } from "./routes/citas";
import { inmueblesRoutes } from "./routes/inmuebles";
import { filtroRoutes } from "./routes/Filtro";
import cors from "@elysiajs/cors";
import staticPlugin from "@elysiajs/static";
import { notificacionRoutes } from "./routes/notificacion";
import { calificacionRoutes } from "./routes/calificaciones";
import "./ws-server"; 
export const app = new Elysia()
  .use(staticPlugin({
        assets: 'uploads', //Carpeta
        prefix: '/public'  //URL externa lol
    }))
  .use(cors({
    origin: '*',
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
  }))
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .use(authRoutes)
  .use(usersRoutes)
  .use(paymentRoutes)
  .use(notificacionRoutes)
  .use(citasRoutes)
  .use(calificacionRoutes)
  .use(inmueblesRoutes) // <-- agregar
  .use(filtroRoutes)
  .get("/", () => "Hello Elysia");

const port = parseInt(process.env.PORT || "3000");
if (!process.env.BUN_TEST) {
  app.listen({ port, hostname: '0.0.0.0' });
  console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

export default app;
