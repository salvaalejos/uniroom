import { describe, test, expect } from "bun:test";
import {
  esEmailValido,
  esPrecioValido,
  esCalificacionValida,
  validarEmail,
  validarNombreCompleto,
  validarTelefono,
  validarPassword,
  validarDatosInmueble,
  sanitizarTexto,
  sanitizarNombreArchivo,
} from "../../src/utils/validation";

describe("esEmailValido & validarEmail", () => {
  test("valid email returns true", () => {
    expect(esEmailValido("test@example.com")).toBe(true);
    expect(validarEmail("estudiante@morelia.tecnm.mx").valido).toBe(true);
  });

  test("invalid email without @ returns false", () => {
    expect(esEmailValido("testexample.com")).toBe(false);
  });

  test("empty string returns false", () => {
    expect(esEmailValido("")).toBe(false);
  });

  test("blocks disposable email domains", () => {
    const res = validarEmail("usuario@yopmail.com");
    expect(res.valido).toBe(false);
    expect(res.field).toBe("email");
  });

  test("blocks invalid domain or consecutive dots", () => {
    expect(validarEmail("user..name@gmail.com").valido).toBe(false);
    expect(validarEmail("user@domain.c").valido).toBe(false);
  });
});

describe("validarNombreCompleto", () => {
  test("accepts valid Spanish names with accents", () => {
    expect(validarNombreCompleto("Alejandro", "Pérez Gómez").valido).toBe(true);
  });

  test("rejects names with numbers or symbols", () => {
    expect(validarNombreCompleto("Juan123", "Pérez").valido).toBe(false);
    expect(validarNombreCompleto("<script>", "Pérez").valido).toBe(false);
  });

  test("rejects single-letter words or excessive repeated characters", () => {
    expect(validarNombreCompleto("A", "B").valido).toBe(false);
    expect(validarNombreCompleto("Aaaaa", "Pérez").valido).toBe(false);
  });
});

describe("validarTelefono", () => {
  test("accepts valid 10-digit Mexican phone number", () => {
    expect(validarTelefono("4431234567").valido).toBe(true);
  });

  test("rejects repeated digits, sequential digits, or leading 0/1", () => {
    expect(validarTelefono("0000000000").valido).toBe(false);
    expect(validarTelefono("5555555555").valido).toBe(false);
    expect(validarTelefono("1234567890").valido).toBe(false);
    expect(validarTelefono("0431234567").valido).toBe(false);
    expect(validarTelefono("443123").valido).toBe(false);
  });
});

describe("validarPassword", () => {
  test("accepts strong password with upper, lower, number, and symbol", () => {
    expect(validarPassword("Segura#2026", { email: "alex@tecnm.mx", nombre: "Alejandro" }).valido).toBe(true);
  });

  test("rejects weak passwords missing requirements or containing user data", () => {
    expect(validarPassword("corta1!").valido).toBe(false);
    expect(validarPassword("sinmayusculas1!").valido).toBe(false);
    expect(validarPassword("SINMINUSCULAS1!").valido).toBe(false);
    expect(validarPassword("SinNumeros!").valido).toBe(false);
    expect(validarPassword("SinSimbolos123").valido).toBe(false);
    expect(validarPassword("Alejandro#2026", { nombre: "Alejandro" }).valido).toBe(false);
  });
});

describe("sanitizarTexto & sanitizarNombreArchivo", () => {
  test("escapes HTML tags and trims text", () => {
    expect(sanitizarTexto("  <script>alert(1)</script> Hola  ")).toBe("&lt;script&gt;alert(1)&lt;/script&gt; Hola");
  });

  test("prevents path traversal in file names", () => {
    expect(sanitizarNombreArchivo("../../etc/passwd")).toBe("passwd");
    expect(sanitizarNombreArchivo("mi foto (1).jpg")).toBe("mi_foto__1_.jpg");
  });
});

describe("esPrecioValido & validarDatosInmueble", () => {
  test("positive number returns true", () => {
    expect(esPrecioValido(5000)).toBe(true);
  });

  test("negative number returns false", () => {
    expect(esPrecioValido(-100)).toBe(false);
  });

  test("string number parses correctly", () => {
    expect(esPrecioValido("3000")).toBe(true);
  });

  test("validates property creation fields", () => {
    expect(
      validarDatosInmueble({
        titulo: "Departamento amueblado cerca del ITM",
        precio_mensual: 3500,
        descripcion: "Excelente departamento con todos los servicios incluidos a dos cuadras.",
        direccion_latitud: 19.7218,
        direccion_longitud: -101.1854,
        esCreacion: true,
      }).valido
    ).toBe(true);
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
