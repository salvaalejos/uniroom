import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { authRoutes } from "./routes/auth";
import { usersRoutes } from "./routes/users";

const app = new Elysia()
  .use(authRoutes)
  .use(usersRoutes)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
