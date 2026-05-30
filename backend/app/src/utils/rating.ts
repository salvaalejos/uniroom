export const calcularRatingPromedio = (calificaciones: { calificacion: number }[]): number => {
    if (!calificaciones || calificaciones.length === 0) return 0;
    const total = calificaciones.reduce((acc, c) => acc + c.calificacion, 0);
    return parseFloat((total / calificaciones.length).toFixed(1));
};

export const formatearRating = (promedio: number, total: number): string => {
    if (total === 0) return "0";
    return promedio.toFixed(1);
};
