import { Elysia } from "elysia";
import { logger } from "./logger";

export const errorHandler = new Elysia().onError(({ code, error, set }) => {
  logger.error(`[Error] ${code}: ${error.message}`, error);
  
  if (code === "NOT_FOUND") {
    set.status = 404;
    return { error: "Recurso no encontrado" };
  }
  if (code === "VALIDATION") {
    set.status = 400;
    return { error: "Error de validación", details: error.all };
  }
  
  set.status = 500;
  return { error: "Error interno del servidor" };
});
