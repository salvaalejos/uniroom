import { describe, test, expect } from "bun:test";
import { esEmailValido, esPrecioValido, esCalificacionValida } from "../../src/utils/validation";

describe("esEmailValido", () => {
    test("valid email returns true", () => {
        expect(esEmailValido("test@example.com")).toBe(true);
    });

    test("invalid email without @ returns false", () => {
        expect(esEmailValido("testexample.com")).toBe(false);
    });

    test("empty string returns false", () => {
        expect(esEmailValido("")).toBe(false);
    });
});

describe("esPrecioValido", () => {
    test("positive number returns true", () => {
        expect(esPrecioValido(5000)).toBe(true);
    });

    test("negative number returns false", () => {
        expect(esPrecioValido(-100)).toBe(false);
    });

    test("string number parses correctly", () => {
        expect(esPrecioValido("3000")).toBe(true);
    });
});

describe("esCalificacionValida", () => {
    test("rating 1-5 returns true", () => {
        expect(esCalificacionValida(3)).toBe(true);
    });

    test("rating 0 returns false", () => {
        expect(esCalificacionValida(0)).toBe(false);
    });

    test("rating 6 returns false", () => {
        expect(esCalificacionValida(6)).toBe(false);
    });
});
