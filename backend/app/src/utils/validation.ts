export const esEmailValido = (email: string): boolean => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
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
