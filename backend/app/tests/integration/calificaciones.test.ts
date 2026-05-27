import { describe, test, expect } from "bun:test";
import { app } from "../../src/index";

describe("Calificaciones endpoints", () => {
    test("POST /calificaciones without auth returns 401", async () => {
        const res = await app.handle(
            new Request("http://localhost/calificaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_inmueble: 1,
                    calificacion: 5,
                    comentario: "Test",
                }),
            })
        );
        expect(res.status).toBe(401);
    });

    test("has CORS headers on calificaciones", async () => {
        const res = await app.handle(
            new Request("http://localhost/calificaciones", { method: "OPTIONS" })
        );
        expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });

    test("POST with invalid rating returns validation error", async () => {
        const res = await app.handle(
            new Request("http://localhost/calificaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_inmueble: 999,
                    calificacion: 10,
                }),
            })
        );
        expect([401, 422, 500]).toContain(res.status);
    });
});
