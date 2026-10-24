export interface PasswordChecks {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noSpaces: boolean;
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

export function evaluarPassword(password: string): PasswordChecks {
  return {
    minLength: password.length >= 8 && password.length <= 128,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
    noSpaces: password.length > 0 && !/\s/.test(password),
  };
}

export function validarEmailCliente(email: string): string | null {
  const limpio = (email || "").trim().toLowerCase();
  if (!limpio) {
    return "Ingresa tu correo electrónico";
  }
  if (limpio.length < 6 || limpio.length > 254) {
    return "El correo electrónico debe tener entre 6 y 254 caracteres";
  }
  if (/\s/.test(limpio)) {
    return "El correo electrónico no puede contener espacios";
  }

  const partes = limpio.split("@");
  if (partes.length !== 2) {
    return "Ingresa un correo con formato válido (ej. usuario@dominio.com)";
  }

  const [local, dominio] = partes;
  if (!local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return "La parte antes del @ no es válida";
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return "El correo contiene caracteres no permitidos";
  }
  if (!dominio || dominio.length < 4 || dominio.includes("..") || dominio.startsWith("-") || dominio.endsWith("-")) {
    return "El dominio del correo electrónico no es válido";
  }

  const etiquetas = dominio.split(".");
  if (etiquetas.length < 2) {
    return "El correo debe incluir una extensión de dominio válida (ej. .com, .mx, .edu.mx)";
  }

  const tld = etiquetas[etiquetas.length - 1];
  if (!/^[a-z]{2,15}$/.test(tld)) {
    return "La terminación del correo no es válida (ej. .com, .mx)";
  }

  for (const et of etiquetas) {
    if (!et || et.startsWith("-") || et.endsWith("-") || !/^[a-z0-9-]+$/.test(et)) {
      return "El dominio del correo tiene un formato inválido";
    }
  }

  if (DOMINIOS_DESECHABLES.has(dominio)) {
    return "No se permiten correos temporales o desechables";
  }

  return null;
}

export function validarNombreCompletoCliente(fullName: string): string | null {
  const limpio = (fullName || "").trim().replace(/\s+/g, " ");
  if (!limpio) {
    return "Ingresa tu nombre completo (nombre y apellido)";
  }
  if (limpio.length < 5 || limpio.length > 100) {
    return "El nombre completo debe tener entre 5 y 100 caracteres";
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(limpio)) {
    return "El nombre solo puede contener letras y espacios (sin números ni símbolos)";
  }
  if (/(.)\1{3,}/i.test(limpio)) {
    return "Ingresa un nombre real sin letras repetidas excesivamente";
  }

  const palabras = limpio.split(" ").filter(Boolean);
  if (palabras.length < 2) {
    return "Ingresa tu nombre y al menos un apellido";
  }
  for (const palabra of palabras) {
    if (palabra.length < 2) {
      return "Cada nombre y apellido debe tener al menos 2 letras";
    }
  }

  return null;
}

export function validarTelefonoCliente(phone: string): string | null {
  const limpio = (phone || "").trim().replace(/[\s-]/g, "");
  if (!limpio) {
    return "El número de teléfono es obligatorio";
  }
  if (!/^\d{10}$/.test(limpio)) {
    return "El número de teléfono debe tener exactamente 10 dígitos numéricos";
  }
  if (limpio.startsWith("0") || limpio.startsWith("1")) {
    return "El teléfono de 10 dígitos no puede iniciar con 0 ni 1";
  }
  if (/^(\d)\1{9}$/.test(limpio)) {
    return "Ingresa un número de teléfono válido (no dígitos repetidos)";
  }
  if (limpio === "1234567890" || limpio === "0123456789" || limpio === "9876543210") {
    return "Por favor ingresa un número de teléfono real";
  }

  return null;
}

export function validarPasswordCliente(
  password: string,
  contexto?: { email?: string; fullName?: string }
): string | null {
  if (!password) {
    return "Ingresa una contraseña";
  }
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres";
  }
  if (password.length > 128) {
    return "La contraseña no puede superar los 128 caracteres";
  }
  if (/\s/.test(password)) {
    return "La contraseña no debe contener espacios";
  }
  if (!/[A-Z]/.test(password)) {
    return "Incluye al menos una letra mayúscula (A-Z)";
  }
  if (!/[a-z]/.test(password)) {
    return "Incluye al menos una letra minúscula (a-z)";
  }
  if (!/[0-9]/.test(password)) {
    return "Incluye al menos un número (0-9)";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return "Incluye al menos un carácter especial (ej. !@#$%&*)";
  }

  const lower = password.toLowerCase();
  if (PASSWORDS_COMUNES.has(lower)) {
    return "Esta contraseña es muy común. Elige una más segura";
  }

  if (contexto?.email) {
    const localEmail = contexto.email.trim().split("@")[0]?.toLowerCase();
    if (localEmail && localEmail.length >= 4 && lower.includes(localEmail)) {
      return "La contraseña no puede contener tu correo electrónico";
    }
  }

  if (contexto?.fullName) {
    const primerNombre = contexto.fullName.trim().split(/\s+/)[0]?.toLowerCase();
    if (primerNombre && primerNombre.length >= 3 && lower.includes(primerNombre)) {
      return "La contraseña no puede contener tu nombre";
    }
  }

  return null;
}

export function validarLuhnTarjeta(numero: string): boolean {
  const limpio = numero.replace(/\D/g, "");
  if (limpio.length < 13 || limpio.length > 19) return false;
  if (/^(\d)\1+$/.test(limpio)) return false;

  let suma = 0;
  let duplicar = false;
  for (let i = limpio.length - 1; i >= 0; i--) {
    let digito = parseInt(limpio.charAt(i), 10);
    if (duplicar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

export function validarExpiracionTarjeta(exp: string): string | null {
  const limpio = (exp || "").trim();
  if (!/^\d{2}\/\d{2}$/.test(limpio)) {
    return "Usa el formato MM/AA (ej. 08/28)";
  }
  const [mesStr, anioStr] = limpio.split("/");
  const mes = parseInt(mesStr, 10);
  const anio = 2000 + parseInt(anioStr, 10);

  if (mes < 1 || mes > 12) {
    return "El mes debe estar entre 01 y 12";
  }

  const ahora = new Date();
  const anioActual = ahora.getFullYear();
  const mesActual = ahora.getMonth() + 1;

  if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
    return "La tarjeta ingresada está vencida";
  }
  if (anio > anioActual + 20) {
    return "El año de vencimiento no es válido";
  }

  return null;
}
