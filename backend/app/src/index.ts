import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";

const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "super_secret_elysia_key",
    })
  )
  .use(authRoutes)
  .use(usersRoutes)
  .get("/", () => "Hello Elysia")
  .listen({ port: 3000, hostname: "0.0.0.0" });

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
