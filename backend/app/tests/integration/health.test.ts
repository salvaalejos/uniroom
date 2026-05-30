import { describe, test, expect } from "bun:test";
import { app } from "../../src/index";

describe("Health endpoint", () => {
    test("GET / returns 200", async () => {
        const res = await app.handle(new Request("http://localhost/"));
        expect(res.status).toBe(200);
    });

    test("GET / returns Hello Elysia text", async () => {
        const res = await app.handle(new Request("http://localhost/"));
        const text = await res.text();
        expect(text).toBe("Hello Elysia");
    });

    test("GET / responds in < 1s", async () => {
        const start = Date.now();
        await app.handle(new Request("http://localhost/"));
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(1000);
    });
});
