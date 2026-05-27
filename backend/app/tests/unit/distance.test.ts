import { describe, test, expect } from "bun:test";
import { getDistancia, TEC_ITM } from "../../src/utils/distance";

describe("getDistancia (Haversine)", () => {
    test("distance to self is 0", () => {
        const d = getDistancia(TEC_ITM.latitude, TEC_ITM.longitude);
        expect(d).toBe(0);
    });

    test("distance to another point in Morelia is reasonable", () => {
        const d = getDistancia(19.7100, -101.1900);
        expect(d).toBeGreaterThan(0);
        expect(d).toBeLessThan(5);
    });

    test("distance to Mexico City is ~217km", () => {
        const d = getDistancia(19.4326, -99.1332);
        expect(d).toBeGreaterThan(200);
        expect(d).toBeLessThan(250);
    });
});
