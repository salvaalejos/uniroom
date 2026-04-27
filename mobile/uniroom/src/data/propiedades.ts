export type Propiedad = {
  id: number;
  precio: number;
  lat: number;
  lng: number;
  tipo: string;
  titulo: string;
  anfitrion: string;
  calificacion: number;
  opiniones: number;
  ubicacion: string;
  descripcion: string;
  servicios: string[];
  reglas: string[];
  contacto: string;
  media: { tipo: 'imagen' | 'video'; src: any }[];
};

export const PROPIEDADES: Propiedad[] = [
  {
    id: 1, precio: 3200, lat: 19.7225, lng: -101.184, tipo: "Cuarto",
    titulo: "🌙 Cuarto amueblado cerca del Tec",
    anfitrion: "Carlos Martínez", calificacion: 4.8, opiniones: 23,
    ubicacion: "Cerca del Tec de Morelia — Zona tranquila, a 3 min caminando",
    descripcion: "Cuarto amueblado con cama matrimonial, escritorio, clóset y ventilador. Incluye internet de alta velocidad (150 MB) y servicios básicos. Ambiente tranquilo y seguro, ideal para estudiante que busca concentrarse en sus estudios.",
    servicios: ["WiFi 150MB", "Agua incluida", "Luz incluida", "Limpieza semanal", "Seguridad 24/7"],
    reglas: ["No mascotas", "No fumar", "Horario de silencio 10pm - 7am", "No visitas después de 11pm"],
    contacto: "55 1234 5678",
    media: [
      { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
      { tipo: "imagen", src: require("../default_images/fachada.jpg") },
    ]
  },
  {
    id: 2, precio: 4800, lat: 19.7208, lng: -101.1862, tipo: "Departamento",
    titulo: "🏢 Departamento centro histórico",
    anfitrion: "Stevenson Ramírez", calificacion: 4.91, opiniones: 56,
    ubicacion: "Centro Histórico, Morelia — Zona tranquila, cerca de transporte público",
    descripcion: "Departamento amueblado de 2 habitaciones en el corazón de Morelia. Ideal para estudiantes o profesionistas. Incluye todos los servicios básicos, acceso a áreas comunes y terraza con vista a la catedral.",
    servicios: ["WiFi 200MB", "Agua incluida", "Luz incluida", "Lavadora", "Estacionamiento", "Terraza", "Seguridad 24/7"],
    reglas: ["No mascotas", "No fumar", "No fiestas", "Máx. 3 personas", "Depósito de garantía"],
    contacto: "55 1234 5678",
    media: [
      { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
      { tipo: "imagen", src: require("../default_images/fachada.jpg") },
      { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
      { tipo: "video", src: require("../default_images/twt.mp4") },
    ]
  },
  {
    id: 3, precio: 2700, lat: 19.7231, lng: -101.1848, tipo: "Cuarto",
    titulo: "💸 Cuarto económico para estudiante",
    anfitrion: "Laura Gutiérrez", calificacion: 4.5, opiniones: 34,
    ubicacion: "Colonia Universidad — A 5 min del Tec",
    descripcion: "Cuarto sencillo pero cómodo, ideal para estudiante que busca algo económico sin sacrificar comodidad. Cerca de tiendas de conveniencia y parada de camiones.",
    servicios: ["Agua incluida", "Luz incluida", "Internet 50MB", "Cocina compartida"],
    reglas: ["No fiestas", "No visitas después de 11pm", "Mantener limpieza"],
    contacto: "55 9876 5432",
    media: [{ tipo: "imagen", src: require("../default_images/otracasa.jpeg") }]
  },
  {
    id: 4, precio: 5500, lat: 19.7202, lng: -101.1835, tipo: "Casa",
    titulo: "🏠 Casa compartida con jardín",
    anfitrion: "Miguel Rodríguez", calificacion: 4.7, opiniones: 42,
    ubicacion: "Privada del Bosque — Zona residencial exclusiva",
    descripcion: "Casa grande con jardín, cocina equipada, estacionamiento para 2 autos y área de lavado. Compartida con otros estudiantes de intercambio. Ambiente internacional y acogedor.",
    servicios: ["Internet 100MB", "Agua", "Luz", "Gas", "Estacionamiento", "Jardín", "Lavadora", "Secadora"],
    reglas: ["Mascotas permitidas (consultar)", "No fumar dentro", "Mantener limpio", "Respetar áreas comunes"],
    contacto: "55 4567 8901",
    media: [
      { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
      { tipo: "imagen", src: require("../default_images/fachada.jpg") },
    ]
  },
  {
    id: 5, precio: 3900, lat: 19.724, lng: -101.1865, tipo: "Departamento",
    titulo: "🌅 Departamento con balcón",
    anfitrion: "Ana Sofía", calificacion: 4.9, opiniones: 67,
    ubicacion: "Zona Centro — Cerca de todo",
    descripcion: "Departamento moderno con balcón, buena vista a la ciudad, cerca de supermercados, restaurantes y transporte público. Totalmente amueblado y equipado.",
    servicios: ["WiFi 150MB", "Agua", "Luz", "Balcón", "Ascensor", "Estacionamiento", "Seguridad"],
    reglas: ["No mascotas", "No fumar", "No fiestas ruidosas"],
    contacto: "55 2345 6789",
    media: [
      { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
      { tipo: "video", src: require("../default_images/twt.mp4") },
    ]
  },
  {
    id: 6, precio: 2400, lat: 19.7215, lng: -101.187, tipo: "Cuarto",
    titulo: "🛏️ Cuarto sencillo",
    anfitrion: "José Luis", calificacion: 4.3, opiniones: 18,
    ubicacion: "Atras del Tec — Muy cerca, a 1 cuadra",
    descripcion: "Cuarto básico pero funcional, ideal si solo necesitas un lugar para dormir y estudiar. Baño compartido con otros 2 estudiantes.",
    servicios: ["Agua", "Luz", "Internet básico 20MB", "Baño compartido"],
    reglas: ["Sin visitas", "Silencio después de 9pm", "No fumar"],
    contacto: "55 3456 7890",
    media: [{ tipo: "imagen", src: require("../default_images/fachada.jpg") }]
  },
  {
    id: 7, precio: 6200, lat: 19.7235, lng: -101.183, tipo: "Casa",
    titulo: "🏰 Casa grande 3 habitaciones",
    anfitrion: "Patricia Kuri", calificacion: 4.95, opiniones: 89,
    ubicacion: "Residencial Las Águilas — Zona de lujo",
    descripcion: "Casa amplia con 3 habitaciones, 2 baños completos, cocina integral equipada, jardín grande y asador. Perfecta para grupos de estudiantes.",
    servicios: ["Internet fibra 300MB", "Agua", "Luz", "Gas", "Estacionamiento 2 autos", "Jardín", "Lavadora", "Secadora", "Asador"],
    reglas: ["Mascotas bienvenidas", "No fiestas ruidosas después 10pm", "Depósito 1 mes"],
    contacto: "55 4567 1234",
    media: [
      { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
      { tipo: "imagen", src: require("../default_images/fachada.jpg") },
      { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
    ]
  },
  {
    id: 8, precio: 3100, lat: 19.7195, lng: -101.185, tipo: "Cuarto",
    titulo: "🚪 Cuarto con baño propio",
    anfitrion: "Roberto Mendoza", calificacion: 4.6, opiniones: 27,
    ubicacion: "Calle del Tec — Entrada principal",
    descripcion: "Cuarto con baño privado y entrada independiente. Muy privado y cómodo. Incluye mini refrigerador y microondas.",
    servicios: ["Agua", "Luz", "Internet 100MB", "Baño propio", "Mini refrigerador"],
    reglas: ["No fiestas", "No fumar", "No mascotas"],
    contacto: "55 5678 9012",
    media: [
      { tipo: "imagen", src: require("../default_images/fachada.jpg") },
      { tipo: "video", src: require("../default_images/twt.mp4") },
    ]
  },
  {
    id: 9, precio: 4100, lat: 19.7228, lng: -101.188, tipo: "Departamento",
    titulo: "✨ Departamento amueblado",
    anfitrion: "Sofía Reyes", calificacion: 4.85, opiniones: 51,
    ubicacion: "Colonia Nueva — Zona tranquila y segura",
    descripcion: "Departamento completamente amueblado, cocina equipada, internet de fibra óptica. A 10 min caminando del Tec.",
    servicios: ["Internet fibra 200MB", "Agua", "Luz", "Amueblado", "Estacionamiento", "Seguridad"],
    reglas: ["No mascotas", "No fumar", "Responsabilidad sobre el mobiliario"],
    contacto: "55 6789 0123",
    media: [
      { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
      { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
    ]
  },
  {
    id: 10, precio: 2900, lat: 19.7205, lng: -101.1825, tipo: "Cuarto",
    titulo: "💰 Cuarto económico",
    anfitrion: "Luis Torres", calificacion: 4.4, opiniones: 31,
    ubicacion: "Cerca del Walmart — Zona comercial",
    descripcion: "Cuarto económico pero acogedor, servicios incluidos, cerca de tiendas, bancos y transporte público.",
    servicios: ["Agua", "Luz", "Internet 50MB", "Cocina compartida"],
    reglas: ["Horario de visita limitado", "No fumar", "No mascotas"],
    contacto: "55 7890 1234",
    media: [{ tipo: "imagen", src: require("../default_images/fachada.jpg") }]
  },
];