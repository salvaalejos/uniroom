// ─ Importes ─
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState, useRef } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"
import { BlurView } from "expo-blur" // para que se vea bomnito
import { Animated } from "react-native"

// ─ Constantes ─

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

// Foto del anfitrion provicional
const ANFITRION = require("../default_images/anfi.jpg")

// Datos falsos por ahora sjdhsjd
const PROPIEDAD = {
    titulo: "Departamento Centro Morelia",
    anfitrion: "Stevenson",
    precio: 3200,
    calificacion: 4.91,
    opiniones: 3,
    ubicacion: "Centro Histórico, Morelia — Zona tranquila, cerca de transporte público",
    descripcion: "Departamento amueblado de 2 habitaciones en el corazón de Morelia. Ideal para estudiantes. Incluye todos los servicios básicos y acceso a áreas comunes.",
    servicios: ["WiFi incluido", "Agua incluida", "Luz incluida", "Lavadora", "Estacionamiento"],
    reglas: ["No mascotas", "No fumar", "No fiestas", "Máx. 2 personas"],
    contacto: "55 1234 5678",
    media: [
        { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
        { tipo: "imagen", src: require("../default_images/fachada.jpg") },
        { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
        { tipo: "video", src: require("../default_images/twt.mp4") },
    ]
}

// Reseñas de inquilinos anteriores ksdhfsjf
const RESENAS = [
    { autor: "Ana G.", texto: "Muy buen lugar, limpio y tranquilo.", fecha: "12 de enero de 2025 a las 3:25 p.m." },
    { autor: "Carlos M.", texto: "Excelente ubicación, el anfitrión muy amable.", fecha: "3 de febrero de 2025 a las 8:46 a.m." },
    { autor: "Sofía R.", texto: "Todo como se describe, lo recomiendo.", fecha: "28 de marzo de 2025 a las 2:07 p.m." },
]



// ─ Tipos ─

type Resena = { autor: string, texto: string, fecha: string }

type Props = {
    visible: boolean
    onClose: () => void
    navigation: any
}


// ─ Componente ─ ฅ^•ﻌ•^ฅ hola guapuritas

const InmuebleScreen = ({ visible, onClose, navigation }: Props) => {

    const insets = useSafeAreaInsets()
    const scrollRef = useRef<ScrollView>(null)

    const scrollY = useRef(new Animated.Value(0)).current
    // Opacity: 0 cuando está arriba, 1 cuando pasa la imagen
    const headerOpacity = scrollY.interpolate({
        inputRange: [SCREEN_HEIGHT * 0.25, SCREEN_HEIGHT * 0.35],
        outputRange: [0, 1],
        extrapolate: "clamp"
    })

    const [favorito, setFavorito] = useState(false)
    const [imagenActual, setImagenActual] = useState(0)
    const [verComentarios, setVerComentarios] = useState(false)

    const player = useVideoPlayer(
        PROPIEDAD.media[imagenActual].tipo === "video" ? PROPIEDAD.media[imagenActual].src : null
    )

    return(

        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>

            <View style={[styles.container, { paddingTop: insets.top}]}>

                {/* Header */}
                <Animated.View style={[styles.header, { opacity: headerOpacity }]}>

                    <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill}/>

                    {/* Boton de cerrar */}
                    <TouchableOpacity style={styles.btnCerrar} onPress={onClose}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
                    </TouchableOpacity>
                    {/* Boton de favorito */}
                    <TouchableOpacity style={styles.btnFavorito} onPress={() => setFavorito(!favorito)}>
                        <MaterialCommunityIcons name={favorito ? "heart" : "heart-outline"} size={26} color={favorito ? "#e74c3c" : "#1a1a2e"}/>
                    </TouchableOpacity>

                </Animated.View>

                {/* Botones visibles (cuando header esta oculto) */}
                <Animated.View style={[styles.botonesFlotantes, { opacity: headerOpacity.interpolate({inputRange: [0, 1], outputRange: [1, 0]})}]}>

                    {/* Boton de cerrar */}
                    <TouchableOpacity style={styles.btnCerrar} onPress={onClose}>
                        <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
                    </TouchableOpacity>
                    {/* Boton de favorito */}
                    <TouchableOpacity style={styles.btnFavorito} onPress={() => setFavorito(!favorito)}>
                        <MaterialCommunityIcons name={favorito ? "heart" : "heart-outline"} size={26} color={favorito ? "#e74c3c" : "#1a1a2e"}/>
                    </TouchableOpacity>

                </Animated.View>


                <ScrollView bounces={false} showsVerticalScrollIndicator={false} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })} scrollEventThrottle={16}>

                    {/* Galeria */}
                    <View style={styles.galeriaContainer}>

                        <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)
                            setImagenActual(index)
                        }}>
                            {PROPIEDAD.media.map((item, i) => (
                                item.tipo === "imagen" ? (
                                    <Image key={i} source={item.src} style={styles.imagenPrincipal}/>
                                ) : (
                                    <VideoView
                                    key={i}
                                    player={player}
                                    style={styles.imagenPrincipal}
                                    allowsFullscreen
                                    allowsPictureInPicture/>
                                )
                            ))}
                        </ScrollView>

                        {/* Miniautas */}
                        <View style={styles.miniaturas}>
                            {PROPIEDAD.media.map((item, i) => (
                                <TouchableOpacity key={i} onPress={() => {
                                    setImagenActual(i)
                                    scrollRef.current?.scrollTo({ x: i * Dimensions.get('window').width, animated: true })
                                }}>
                                    {item.tipo === "imagen" ? (
                                        <Image source={item.src} style={[styles.miniatura, imagenActual === i && styles.miniaturaActiva]}/>
                                    ) : (
                                        <View style={[styles.miniatura, styles.miniaturaVideo, imagenActual === i && styles.miniaturaActiva]}>
                                            <MaterialCommunityIcons name="play-circle" size={28} color="#fff"/>
                                        </View>
                                    )}
                                    
                                </TouchableOpacity>
                            ))}
                        </View>

                    </View>

                    {/* Informacion Principal */}
                    <View style={styles.info}>

                        {/* Titulo y calificaciones jsjs */}
                        <Text style={styles.titulo}>{PROPIEDAD.titulo}</Text>
                        
                        <View style={styles.calificacionContainer}>

                            <View style={styles.calificacionItem}>
                                <Text style={styles.calificacionNumero}>{PROPIEDAD.calificacion}</Text>
                                {/* La idea es que saca el promedio de las valoraciones de las resenas de los usuarios */}
                                <View style={styles.estrellas}>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <MaterialCommunityIcons
                                            key={i}
                                            name={i <= 4 ? "star" : "star-outline"}
                                            size={25}
                                            color="#f39c12"
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.calificacionItem}>
                                <Text style={styles.calificacionNumero}>{PROPIEDAD.opiniones}</Text>
                                <Text style={styles.opinionesLabel}>opiniones</Text>
                            </View>

                        </View>


                        <View style={styles.divider}/>

                        {/* Anfitrion */}
                        <View style={styles.anfitrionRow}>
                            <Image source={ANFITRION} style={styles.avatarImagen}/>
                            <View>
                                <Text style={styles.anfitrionLabel}>Anfitrión</Text>
                                <Text style={styles.anfitrionNombre}>{PROPIEDAD.anfitrion}</Text>
                            </View>
                        </View>

                        <View style={styles.divider}/>

                        {/* Ubicacion */}
                        <View style={styles.seccion}>
                            <MaterialCommunityIcons name="map-marker" size={18} color="#205EA6" />
                            <Text style={styles.seccionTexto}>{PROPIEDAD.ubicacion}</Text>
                        </View>

                        <View style={styles.divider}/>

                        {/* Descripción */}
                        <Text style={styles.descripcion}>{PROPIEDAD.descripcion}</Text>
                        
                        <View style={styles.divider}/>

                        {/* Tipo */}
                        <Text style={styles.subtitulo}>Tipo de vivienda</Text>
                        <View style={styles.tags}>
                                <View style={styles.tag}>
                                    <Text style={styles.tagTexto}>Casa</Text>
                                </View>
                        </View>

                        <View style={styles.divider}/>

                        {/* Servicios */}
                        <Text style={styles.subtitulo}>Servicios incluidos</Text>
                        <View style={styles.tags}>
                            {PROPIEDAD.servicios.map((s, i) => (
                                <View key={i} style={styles.tag}>
                                    <Text style={styles.tagTexto}>{s}</Text>
                                </View>
                            ))}
                        </View>
                        
                        <View style={styles.divider}/>

                        {/* Reglas */}
                        <Text style={styles.subtitulo}>Reglas de la vivienda</Text>
                        <View style={styles.tags}>
                            {PROPIEDAD.reglas.map((r, i) => (
                                <View key={i} style={[styles.tag, styles.tagRegla]}>
                                    <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{r}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.divider}/>

                        {/* Comentarios predefinidos */}
                        <View style={styles.comentarioEncabezado}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <MaterialCommunityIcons name="star" size={18} color="#f39c12" />
                                <View>
                                    <Text style={styles.comentarioEncabezadoTexto}>Reseñas del público</Text>
                                    <Text style={{ fontSize: 12, color: "#185FA5" }}>{RESENAS.length} opiniones</Text>
                                </View>
                            </View>
                            {RESENAS.length > 0 && (
                                <TouchableOpacity onPress={() => setVerComentarios(!verComentarios)}>
                                    <MaterialCommunityIcons
                                        name={verComentarios ? "chevron-up" : "chevron-down"}
                                        size={24}
                                        color="#185FA5"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {RESENAS.length === 0 ? (
                            <Text style={{ color: "#aaa", textAlign: "center", marginBottom: 20 }}>
                                Aún no hay reseñas para este lugar.
                            </Text>
                        ) : verComentarios ? (
                            RESENAS.map((c, i) => (
                                <View key={i} style={styles.comentario}>
                                    <Image source={ANFITRION} style={styles.comentarioAvatar}/>
                                    <View style={{flex: 1}}>
                                        <View style={{ flexDirection: "column", justifyContent: "space-between" }}>
                                            <Text style={styles.comentarioAutor}>{c.autor}</Text>
                                            <Text style={{ fontSize: 11, color: "#aaa" }}>{c.fecha}</Text>
                                        </View>
                                        <Text style={styles.comentarioTexto}>{c.texto}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={{ color: "#aaa", textAlign: "center", marginBottom: 20, fontSize: 13 }}>
                                Toca la flecha para ver las reseñas.
                            </Text>
                        )}
                        
                    </View>

                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerPrecio}>${PROPIEDAD.precio.toLocaleString('es-MX')}</Text>
                        <Text style={styles.footerMes}>/ mes</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.btnContacto}
                        onPress={() => {
                            onClose()
                            navigation.navigate("AgendarCita")}}>
                        <MaterialCommunityIcons name="calendar" size={18} color="#fff"/>
                        <Text style={styles.btnContactoTexto}>Agendar Cita</Text>
                    </TouchableOpacity>
                </View>

            </View>

        </Modal>
    )
}

export default InmuebleScreen

// ─ Estilos ─

const styles = StyleSheet.create({

    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        paddingTop: 65,
        overflow: "hidden",
    },
    botonesFlotantes: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    galeriaContainer: {
        position: "relative",
    },
    imagenPrincipal: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.38,
        resizeMode: "cover",
    },
    btnCerrar: {
        position: "absolute",
        top: 16,
        left: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    btnFavorito: {
        position: "absolute",
        top: 16,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    miniaturas: {
        flexDirection: "row",
        gap: 8,
        padding: 12,
        backgroundColor: "#f5f5f5",
    },
    miniatura: {
        width: 60,
        height: 50,
        borderRadius: 8,
        opacity: 0.6,
    },
    miniaturaVideo: {
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
    },
    miniaturaActiva: {
        opacity: 1,
        borderWidth: 2,
        borderColor: "#205EA6",
        borderRadius: 8,
    },
    info: {
        padding: 20,
    },
    titulo: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a2e",
        marginBottom: 8,
    },
    calificacionContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 8,
    },
    calificacionItem: {
        alignItems: "center",
        gap: 4,
    },
    calificacionNumero: {
        fontSize: 26,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    estrellas: {
        flexDirection: "row",
        gap: 2,
    },
    opinionesLabel: {
        fontSize: 14,
        color: "#1a1a2e",
    },
    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 16,
    },
    anfitrionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarImagen: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    anfitrionLabel: {
        fontSize: 12,
        color: "#888",
    },
    anfitrionNombre: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    seccion: {
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
    },
    seccionTexto: {
        flex: 1,
        fontSize: 14,
        color: "#444",
        lineHeight: 20,
    },
    descripcion: {
        fontSize: 14,
        color: "#555",
        lineHeight: 22,
    },
    subtitulo: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 10,
    },
    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        backgroundColor: "#EEF4FF",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    tagTexto: {
        fontSize: 13,
        color: "#205EA6",
        fontWeight: "600",
    },
    tagRegla: {
        backgroundColor: "#FFF0F0",
    },
    tagTextoRegla: {
        color: "#b83e31",
    },
    comentarioEncabezado: {
        borderLeftWidth: 2,
        borderLeftColor: "#205EA6",
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f0f5fc",
        marginBottom: 20,
    },
    comentarioEncabezadoTexto: {
        fontSize: 15,
        fontWeight: "600",
        color: "#0C447C",
    },
    comentario: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
        alignItems: "flex-start",
    },
    comentarioAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    comentarioAutor: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    comentarioTexto: {
        fontSize: 14,
        color: "#666",
        marginTop: 2,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        backgroundColor: "#fff",
    },
    footerPrecio: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    footerMes: {
        fontSize: 12,
        color: "#888",
    },
    btnContacto: {
        flexDirection: "row",
        backgroundColor: "#205EA6",
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: "center",
        gap: 8,
    },
    btnContactoTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },

})