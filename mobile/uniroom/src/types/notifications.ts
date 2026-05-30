export type Notificacion = {
    id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    remitente: string;
    remitenteFoto?: string;
    fecha: string;
    relacionado_a?: string;
    datosExtra?: any;
};

export type ContactoType = {
    id_usuario: string;
    nombre: string;
};
