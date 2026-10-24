export interface ResultadoValidacion {
  valido: boolean;
  error?: string;
  field?: string;
}

const DOMINIOS_DESECHABLES = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "throwawaymail.com",
]);

const PASSWORDS_COMUNES = new Set([
  "password123!",
  "qwerty123!",
  "admin123!",
  "uniroom123!",
  "uniroomie123!",
  "12345678a!",
  "contraseña1!",
  "welcome123!",
]);

export const validarEmail = (email: string): ResultadoValidacion => {
  if (!email || typeof email !== "string") {
    return { valido: false, error: "El correo electrónico es obligatorio", field: "email" };
  }

  const limpio = email.trim().toLowerCase();

  if (limpio.length < 6 || limpio.length > 254) {
    return {
      valido: false,
      error: "El correo electrónico debe tener entre 6 y 254 caracteres",
      field: "email",
    };
  }

  if (/\s/.test(limpio)) {
    return {
      valido: false,
      error: "El correo electrónico no puede contener espacios",
      field: "email",
    };
  }

  const partes = limpio.split("@");
  if (partes.length !== 2) {
    return {
      valido: false,
      error: "El formato del correo electrónico no es válido (ejemplo: usuario@dominio.com)",
      field: "email",
    };
  }

  const [local, dominio] = partes;

  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return {
      valido: false,
      error: "El nombre de usuario del correo electrónico no es válido",
      field: "email",
    };
  }

  const localRegex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
  if (!localRegex.test(local)) {
    return {
      valido: false,
      error: "El correo electrónico contiene caracteres no permitidos",
      field: "email",
    };
  }

  if (!dominio || dominio.length < 4 || dominio.includes("..") || dominio.startsWith("-") || dominio.endsWith("-")) {
    return {
      valido: false,
      error: "El dominio del correo electrónico no es válido",
      field: "email",
    };
  }

  const etiquetasDominio = dominio.split(".");
  if (etiquetasDominio.length < 2) {
    return {
      valido: false,
      error: "El correo debe incluir un dominio válido (ej. .com, .mx, .edu.mx)",
      field: "email",
    };
  }

  const tld = etiquetasDominio[etiquetasDominio.length - 1];
  if (!/^[a-z]{2,15}$/.test(tld)) {
    return {
      valido: false,
      error: "La extensión del dominio del correo no es válida",
      field: "email",
    };
  }

  for (const etiqueta of etiquetasDominio) {
    if (!etiqueta || etiqueta.startsWith("-") || etiqueta.endsWith("-") || !/^[a-z0-9-]+$/.test(etiqueta)) {
      return {
        valido: false,
        error: "El dominio del correo electrónico tiene un formato inválido",
        field: "email",
      };
    }
  }

  if (DOMINIOS_DESECHABLES.has(dominio)) {
    return {
      valido: false,
      error: "No se permiten correos electrónicos temporales o desechables",
      field: "email",
    };
  }

  return { valido: true };
};

export const esEmailValido = (email: string): boolean => {
  return validarEmail(email).valido;
};

export const validarTextoNombre = (
  texto: string,
  etiquetaCampo: string = "nombre",
  fieldKey: string = "fullName"
): ResultadoValidacion => {
  if (!texto || typeof texto !== "string") {
    return { valido: false, error: `El ${etiquetaCampo} es obligatorio`, field: fieldKey };
  }

  const limpio = texto.trim().replace(/\s+/g, " ");

  if (limpio.length < 2 || limpio.length > 100) {
    return {
      valido: false,
      error: `El ${etiquetaCampo} debe tener entre 2 y 100 caracteres`,
      field: fieldKey,
    };
  }

  const soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
  if (!soloLetrasRegex.test(limpio)) {
    return {
      valido: false,
      error: `El ${etiquetaCampo} solo puede contener letras y espacios (sin números ni símbolos)`,
      field: fieldKey,
    };
  }

  if (/(.)\1{3,}/i.test(limpio)) {
    return {
      valido: false,
      error: `Ingresa un ${etiquetaCampo} válido sin repetir letras excesivamente`,
      field: fieldKey,
    };
  }

  const palabras = limpio.split(" ").filter(Boolean);
  for (const palabra of palabras) {
    if (palabra.length < 2) {
      return {
        valido: false,
        error: `Cada palabra del ${etiquetaCampo} debe tener al menos 2 letras`,
        field: fieldKey,
      };
    }
  }

  return { valido: true };
};

export const validarNombreCompleto = (nombre: string, apellidos: string): ResultadoValidacion => {
  const valNombre = validarTextoNombre(nombre, "nombre", "fullName");
  if (!valNombre.valido) return valNombre;

  const valApellidos = validarTextoNombre(apellidos, "apellido", "fullName");
  if (!valApellidos.valido) return valApellidos;

  return { valido: true };
};

export const validarTelefono = (telefono?: string | null): ResultadoValidacion => {
  if (!telefono || typeof telefono !== "string" || telefono.trim().length === 0) {
    return {
      valido: false,
      error: "El número de teléfono es obligatorio",
      field: "phone",
    };
  }

  const limpio = telefono.trim().replace(/[\s-]/g, "");

  if (!/^\d{10}$/.test(limpio)) {
    return {
      valido: false,
      error: "El número de teléfono debe tener exactamente 10 dígitos numéricos",
      field: "phone",
    };
  }

  if (limpio.startsWith("0") || limpio.startsWith("1")) {
    return {
      valido: false,
      error: "Ingresa un número de teléfono válido de 10 dígitos (no puede iniciar con 0 o 1)",
      field: "phone",
    };
  }

  if (/^(\d)\1{9}$/.test(limpio)) {
    return {
      valido: false,
      error: "El número de teléfono ingresado no es válido (dígitos repetidos)",
      field: "phone",
    };
  }

  if (limpio === "1234567890" || limpio === "0123456789" || limpio === "9876543210") {
    return {
      valido: false,
      error: "Por favor ingresa un número de teléfono real",
      field: "phone",
    };
  }

  return { valido: true };
};

export const validarPassword = (
  password: string,
  contexto?: { email?: string; nombre?: string }
): ResultadoValidacion => {
  if (!password || typeof password !== "string") {
    return { valido: false, error: "La contraseña es obligatoria", field: "password" };
  }

  if (password.length < 8) {
    return {
      valido: false,
      error: "La contraseña debe tener al menos 8 caracteres",
      field: "password",
    };
  }

  if (password.length > 128) {
    return {
      valido: false,
      error: "La contraseña no puede exceder los 128 caracteres",
      field: "password",
    };
  }

  if (/\s/.test(password)) {
    return {
      valido: false,
      error: "La contraseña no debe contener espacios en blanco",
      field: "password",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valido: false,
      error: "La contraseña debe incluir al menos una letra mayúscula (A-Z)",
      field: "password",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valido: false,
      error: "La contraseña debe incluir al menos una letra minúscula (a-z)",
      field: "password",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valido: false,
      error: "La contraseña debe incluir al menos un número (0-9)",
      field: "password",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return {
      valido: false,
      error: "La contraseña debe incluir al menos un carácter especial (ej. !@#$%&*)",
      field: "password",
    };
  }

  const lowerPass = password.toLowerCase();
  if (PASSWORDS_COMUNES.has(lowerPass)) {
    return {
      valido: false,
      error: "Esta contraseña es muy común. Elige una más segura",
      field: "password",
    };
  }

  if (contexto?.email) {
    const localEmail = contexto.email.split("@")[0]?.toLowerCase();
    if (localEmail && localEmail.length >= 4 && lowerPass.includes(localEmail)) {
      return {
        valido: false,
        error: "La contraseña no puede contener tu dirección de correo electrónico",
        field: "password",
      };
    }
  }

  if (contexto?.nombre) {
    const primerNombre = contexto.nombre.trim().split(/\s+/)[0]?.toLowerCase();
    if (primerNombre && primerNombre.length >= 3 && lowerPass.includes(primerNombre)) {
      return {
        valido: false,
        error: "La contraseña no puede contener tu nombre personal",
        field: "password",
      };
    }
  }

  return { valido: true };
};

export const esPrecioValido = (precio: unknown): boolean => {
  if (typeof precio === "number" && precio > 0 && precio < 999999) return true;
  if (typeof precio === "string") {
    const num = parseFloat(precio);
    return !isNaN(num) && num > 0 && num < 999999;
  }
  return false;
};

export const esCalificacionValida = (calificacion: number): boolean => {
  return Number.isInteger(calificacion) && calificacion >= 1 && calificacion <= 5;
};

export const sanitizarTexto = (texto: string | undefined | null, maxLength: number = 1000): string => {
  if (!texto || typeof texto !== "string") return "";
  return texto
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim()
    .slice(0, maxLength);
};

export const sanitizarNombreArchivo = (fileName: string | undefined | null): string => {
  if (!fileName || typeof fileName !== "string") return "file.jpg";
  const base = fileName.split(/[\\/]/).pop() || "file.jpg";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
};

export const validarDatosInmueble = (datos: {
  titulo?: string;
  precio_mensual?: unknown;
  descripcion?: string;
  direccion_latitud?: unknown;
  direccion_longitud?: unknown;
  esCreacion?: boolean;
}): ResultadoValidacion => {
  if (datos.esCreacion || datos.titulo !== undefined) {
    const tituloLimpio = (datos.titulo || "").trim();
    if (tituloLimpio.length < 8 || tituloLimpio.length > 150) {
      return {
        valido: false,
        error: "El título del inmueble debe tener entre 8 y 150 caracteres",
        field: "titulo",
      };
    }
    if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(tituloLimpio)) {
      return {
        valido: false,
        error: "El título debe contener palabras descriptivas válidas",
        field: "titulo",
      };
    }
  }

  if (datos.esCreacion || datos.precio_mensual !== undefined) {
    const num =
      typeof datos.precio_mensual === "number"
        ? datos.precio_mensual
        : parseFloat(String(datos.precio_mensual));
    if (isNaN(num) || num < 500 || num > 100000) {
      return {
        valido: false,
        error: "El precio mensual debe estar entre $500 y $100,000 MXN",
        field: "precio",
      };
    }
  }

  if (datos.esCreacion || datos.descripcion !== undefined) {
    const descLimpia = (datos.descripcion || "").trim();
    if (descLimpia.length < 20 || descLimpia.length > 2000) {
      return {
        valido: false,
        error: "La descripción debe tener entre 20 y 2,000 caracteres",
        field: "descripcion",
      };
    }
  }

  if (datos.direccion_latitud !== undefined && datos.direccion_latitud !== null) {
    const lat = parseFloat(String(datos.direccion_latitud));
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return {
        valido: false,
        error: "La latitud de la ubicación no es válida",
        field: "ubicacion",
      };
    }
  }

  if (datos.direccion_longitud !== undefined && datos.direccion_longitud !== null) {
    const lng = parseFloat(String(datos.direccion_longitud));
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return {
        valido: false,
        error: "La longitud de la ubicación no es válida",
        field: "ubicacion",
      };
    }
  }

  return { valido: true };
};
