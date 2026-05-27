import { describe, test, expect } from "bun:test";
import { calcularRatingPromedio, formatearRating } from "../../src/utils/rating";

describe("calcularRatingPromedio", () => {
    test("empty array returns 0", () => {
        expect(calcularRatingPromedio([])).toBe(0);
    });

    test("single rating returns same value", () => {
        expect(calcularRatingPromedio([{ calificacion: 4 }])).toBe(4);
    });

    test("average of multiple ratings is correct", () => {
        const ratings = [
            { calificacion: 5 },
            { calificacion: 4 },
            { calificacion: 3 },
        ];
        expect(calcularRatingPromedio(ratings)).toBe(4);
    });
});

describe("formatearRating", () => {
    test("zero total returns 0", () => {
        expect(formatearRating(0, 0)).toBe("0");
    });

    test("formats average correctly", () => {
        expect(formatearRating(4.5, 10)).toBe("4.5");
    });
});
