import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";
import { paymentRoutes } from "./routes/payments";
import { citasRoutes } from "./routes/citas";
import { inmueblesRoutes } from "./routes/inmuebles";
import cors from "@elysiajs/cors";
import staticPlugin from "@elysiajs/static";
import { notificacionRoutes } from "./routes/notificacion";
import { calificacionRoutes } from "./routes/calificaciones";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./middlewares/logger";
import "./ws-server"; 
export const app = new Elysia()
  .use(errorHandler)
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
  .get("/", () => "Hello Elysia");

const port = parseInt(process.env.PORT || "3000");
if (!process.env.BUN_TEST) {
  app.listen({ port, hostname: '0.0.0.0' });
  logger.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
}

export default app;
