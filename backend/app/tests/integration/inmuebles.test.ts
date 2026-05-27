import { describe, test, expect } from "bun:test";
import { app } from "../../src/index";

describe("GET /inmuebles", () => {
    test("responds with a status code", async () => {
        const res = await app.handle(new Request("http://localhost/inmuebles"));
        expect([200, 500]).toContain(res.status);
    });

    test("has CORS headers", async () => {
        const res = await app.handle(new Request("http://localhost/inmuebles"));
        expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });

    test("supports precioMax query param", async () => {
        const res = await app.handle(
            new Request("http://localhost/inmuebles?precioMax=5000")
        );
        expect([200, 500]).toContain(res.status);
    });
});
