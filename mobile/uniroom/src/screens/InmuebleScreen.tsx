// ─ Importes ─
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState, useRef, useEffect } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"
import { useNavigation } from "@react-navigation/native"
import AgendarCita from "./AgendarCita"
import Constants from "expo-constants"
import AsyncStorage from "@react-native-async-storage/async-storage"

// ─ Constantes ─
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

// Foto del anfitrion provisional
const ANFITRION = require("../default_images/anfi.jpg")

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

const getMediaUri = (src: string): { uri: string } | number => {
    if (!src) return 0;
    if (src.startsWith("http")) return { uri: src };
    return { uri: `${API_BASE_URL}${src}` };
};

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
// const RESENAS = [
//     { autor: "Ana G.", texto: "Muy buen lugar, limpio y tranquilo.", fecha: "12 de enero de 2025 a las 3:25 p.m." },
//     { autor: "Carlos M.", texto: "Excelente ubicación, el anfitrión muy amable.", fecha: "3 de febrero de 2025 a las 8:46 a.m." },
//     { autor: "Sofía R.", texto: "Todo como se describe, lo recomiendo.", fecha: "28 de marzo de 2025 a las 2:07 p.m." },
// ]



// ─ Tipos ─

type Resena = { autor: string, texto: string, fecha: string }

type Props = {
    visible: boolean
    onClose: () => void
    inmueble?: any
    token?: string
}

// ─ Componente ─
const InmuebleScreen = ({ visible: propVisible, onClose: propOnClose, inmueble: propInmueble, token: propToken, route }: any) => {

    const navigation = useNavigation<any>()

    // Obtener parámetros de navegación o de props
    const inmueble = route?.params?.inmueble || propInmueble
    const token = route?.params?.token || propToken
    const visible = route?.params ? true : propVisible
    const onClose = route?.params ? () => navigation.goBack() : propOnClose

    const insets = useSafeAreaInsets()
    const scrollRef = useRef<ScrollView>(null)

    // ── FIX 1, 3, 4: Todos los useState declarados primero, antes de cualquier lógica o return ──
    const [favorito, setFavorito] = useState(false)
    const [imagenActual, setImagenActual] = useState(0)
    const [verComentarios, setVerComentarios] = useState(false)
    const [modalTarifaVisible, setModalTarifaVisible] = useState(false)
    const [puedeRentar, setPuedeRentar] = useState(false)
    const [yaEstáRentando, setYaEstáRentando] = useState(false)
    const [modalRentarVisible, setModalRentarVisible] = useState(false)

    // Verificar si el usuario puede rentar este inmueble
    useEffect(() => {
        const checkRentaPermission = async () => {
            if (!inmueble?.id_inmueble || !token) return
            const hostUri = Constants.expoConfig?.hostUri?.split(":").shift()
            const API_URL = hostUri ? `http://${hostUri}:3000` : "http://localhost:3000"
            try {
                // Refetch el inmueble para obtener info actualizada de autorización
                const resp = await fetch(`${API_URL}/inmuebles/${inmueble.id_inmueble}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (resp.ok) {
                    const data = await resp.json()
                    setPuedeRentar(data.puede_rentar || false)
                    setYaEstáRentando(data.usuario_actualmente_rentando || false)
                }
            } catch (error) {
                console.error("Error verificando permiso de renta:", error)
            }
        }
        checkRentaPermission()
    }, [inmueble?.id_inmueble, token])

    // ── FIX 1: esVideo y videoSource ahora usan imagenActual ya declarado arriba ──
    const esVideo = inmueble?.media?.[imagenActual]?.tipo === "video"
    const videoSource = esVideo ? inmueble?.media?.[imagenActual]?.src : null

    // ── FIX 2: Un solo useVideoPlayer, eliminado el duplicado que estaba más abajo ──
    const player = useVideoPlayer(videoSource, player => {
        if (player && videoSource && visible) {
            player.loop = true
        }
    })

    // Limpiar player cuando se cierra el modal
    useEffect(() => {
        if (!visible && player) {
            try {
                player.pause()
            } catch (e) {
                // Ignorar error al limpiar
            }
        }
    }, [visible, player])

    // Manejar el video cuando cambia el índice
    useEffect(() => {
        if (!visible) return

        if (esVideo && player && videoSource) {
            try {
                player.play()
            } catch (e) {
                console.log("Error al reproducir video:", e)
            }
        } else if (player) {
            try {
                player.pause()
            } catch (e) {
                // Ignorar
            }
        }

        return () => {
            if (player) {
                try {
                    player.pause()
                } catch (e) {
                    // Ignorar
                }
            }
        }
    }, [imagenActual, esVideo, player, videoSource, visible])

    // ── FIX 3: Early return DESPUÉS de todos los hooks ──
    useEffect(() => {
        if (inmueble) {
            console.log("[Detail] Inmueble cargado:", inmueble.titulo);
            console.log("[Detail] Foto Anfitrión:", inmueble.fotoAnfitrion);
            console.log("[Detail] Puede rentar:", puedeRentar);
        }
    }, [inmueble, puedeRentar]);

    if (!inmueble) return null

    const calificaciones = inmueble.calificaciones || []
    const ratingPromedio = calificaciones.length > 0
        ? (calificaciones.reduce((sum, c) => sum + c.calificacion, 0) / calificaciones.length)
        : 0
    const totalOpiniones = calificaciones.length
    const reseñasConComentario = calificaciones.filter(c => c.descripcion && c.descripcion.trim().length > 0)

    return (
        <View style={styles.container}>
            {/* Botones estáticos superiores */}
            <TouchableOpacity
                style={[styles.btnCerrar, { top: insets.top + 16 }]}
                onPress={onClose}
            >
                <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
            </TouchableOpacity>

            {/* <TouchableOpacity
                style={[styles.btnFavorito, { top: insets.top + 16 }]}
                onPress={() => setFavorito(!favorito)}
            >
                <MaterialCommunityIcons
                    name={favorito ? "heart" : "heart-outline"}
                    size={26}
                    color={favorito ? "#e74c3c" : "#1a1a2e"}
                />
            </TouchableOpacity> */}

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {/* Galeria */}
                <View style={styles.galeriaContainer}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)
                            setImagenActual(index)
                        }}
                    >
                        {/* FIX 7: Usar inmueble.media en lugar de PROPIEDAD.media */}
                        {inmueble.media.map((item: any, i: number) => (
                            item.tipo === "imagen" ? (
                                <Image key={i} source={item.src} style={styles.imagenPrincipal}/>
                            ) : (
                                <VideoView
                                    key={i}
                                    player={player}
                                    style={styles.imagenPrincipal}
                                    nativeControls
                                    contentFit="cover"
                                />
                            )
                        ))}
                    </ScrollView>

                    {/* Miniaturas */}
                    {/* FIX 5: Eliminado el )} extra que cerraba incorrectamente aquí */}
                    <View style={styles.miniaturas}>
                        {inmueble.media.map((item: any, i: number) => (
                            <TouchableOpacity key={i} onPress={() => {
                                setImagenActual(i)
                                scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true })
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

                    {/* Titulo y calificaciones */}
                    <Text style={styles.titulo}>{inmueble.titulo}</Text>

                    {totalOpiniones > 0 ? (
                        <View style={styles.calificacionContainer}>
                            <View style={styles.calificacionItem}>
                                <Text style={styles.calificacionNumero}>{ratingPromedio.toFixed(1)}</Text>
                                <View style={styles.estrellas}>
                                {(() => {
                                    const rating = ratingPromedio
                                    return [1, 2, 3, 4, 5].map((i) => {
                                        const icon = i <= Math.floor(rating)
                                            ? "star"
                                            : i === Math.ceil(rating) && rating % 1 !== 0
                                                ? "star-half"
                                                : "star-outline"
                                        return (
                                            <MaterialCommunityIcons
                                                key={i}
                                                name={icon}
                                                size={25}
                                                color="#f39c12"
                                            />
                                        )
                                    })
                                })()}
                            </View>
                            </View>

                            <View style={styles.calificacionItem}>
                                <Text style={styles.calificacionNumero}>{totalOpiniones}</Text>
                                <Text style={styles.opinionesLabel}>opiniones</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.sinReseñas}>
                            <MaterialCommunityIcons name="star-outline" size={20} color="#ccc" />
                            <Text style={styles.sinReseñasTxt}>Aún no hay reseñas</Text>
                        </View>
                    )}

                    <View style={styles.divider}/>

                    {/* Anfitrion */}
                    <View style={styles.anfitrionRow}>
                        <Image source={inmueble.fotoAnfitrion || ANFITRION} style={styles.avatarImagen}/>
                        <View>
                            <Text style={styles.anfitrionLabel}>Anfitrión</Text>
                            <Text style={styles.anfitrionNombre}>{inmueble.anfitrion}</Text>
                        </View>
                    </View>

                    <View style={styles.divider}/>

                    {/* Ubicacion */}
                    <View style={styles.seccion}>
                        <MaterialCommunityIcons name="map-marker" size={18} color="#205EA6" />
                        <Text style={styles.seccionTexto}>{inmueble.ubicacion}</Text>
                    </View>

                    <View style={styles.divider}/>

                    {/* Descripción */}
                    <Text style={styles.descripcion}>{inmueble.descripcion}</Text>

                    <View style={styles.divider}/>

                    {/* Servicios */}
                    <Text style={styles.subtitulo}>Servicios incluidos</Text>
                    <View style={styles.tags}>
                        {inmueble.servicios?.map((s: any, i: number) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagTexto}>{typeof s === 'object' ? s.nombre : s}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider}/>

                    {/* Reglas */}
                    <Text style={styles.subtitulo}>Reglas de la casa</Text>
                    <View style={styles.tags}>
                        {inmueble.restricciones?.map((r: any, i: number) => (
                            <View key={i} style={[styles.tag, styles.tagRegla]}>
                                <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{typeof r === 'object' ? r.nombre : r}</Text>
                            </View>
                        ))}
                        {/* Fallback para cuando vienen como 'reglas' (mocks) */}
                        {inmueble.reglas?.map((r: any, i: number) => (
                            <View key={`regla-${i}`} style={[styles.tag, styles.tagRegla]}>
                                <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{typeof r === 'object' ? r.nombre : r}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider}/>

                    {/* Reseñas de usuarios */}
                    <View style={styles.comentarioEncabezado}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MaterialCommunityIcons name="star" size={18} color="#f39c12" />
                            <View>
                                <Text style={styles.comentarioEncabezadoTexto}>Reseñas del público</Text>
                                <Text style={{ fontSize: 12, color: "#185FA5" }}>{totalOpiniones} opiniones</Text>
                            </View>
                        </View>
                        {reseñasConComentario.length > 0 && (
                            <TouchableOpacity onPress={() => setVerComentarios(!verComentarios)}>
                                <MaterialCommunityIcons
                                    name={verComentarios ? "chevron-up" : "chevron-down"}
                                    size={24}
                                    color="#185FA5"
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {reseñasConComentario.length === 0 ? (
                        <Text style={{ color: "#aaa", textAlign: "center", marginBottom: 20 }}>
                            Aún no hay reseñas para este lugar.
                        </Text>
                    ) : verComentarios ? (
                        reseñasConComentario.map((c: any, i: number) => (
                            <View key={i} style={styles.comentario}>
                                <Image source={c.estudiante?.foto ? getMediaUri(c.estudiante.foto) : ANFITRION} style={styles.comentarioAvatar}/>
                                <View style={{flex: 1}}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <View>
                                            <Text style={styles.comentarioAutor}>{c.estudiante?.nombre || "Usuario"}</Text>
                                            <View style={{ flexDirection: "row", gap: 2 }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <MaterialCommunityIcons
                                                        key={star}
                                                        name={star <= c.calificacion ? "star" : "star-outline"}
                                                        size={14}
                                                        color="#f39c12"
                                                    />
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                    <Text style={styles.comentarioTexto}>{c.descripcion}</Text>
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

            {/* FIX 6: Footer con ambos botones correctamente dentro del View */}
            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerPrecio}>${(Number(inmueble.precio_mensual) || Number(inmueble.precio) || 0).toLocaleString('es-MX')}</Text>
                    <Text style={styles.footerMes}>/ mes</Text>
                </View>

                {yaEstáRentando ? (
                    <View style={styles.btnRentarDisabled}>
                        <MaterialCommunityIcons name="lock" size={18} color="#a0b9e9"/>
                        <Text style={styles.btnRentarDisabledTexto}>Ya tienes una renta activa</Text>
                    </View>
                ) : puedeRentar ? (
                    <TouchableOpacity
                        style={styles.btnContacto}
                        onPress={() => setModalRentarVisible(true)}
                    >
                        <MaterialCommunityIcons name="key" size={18} color="#fff"/>
                        <Text style={styles.btnContactoTexto}>Rentar</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.btnContacto}
                        onPress={() => {
                            onClose()
                            navigation.navigate("Navigator", {
                                screen: "Inmuebles",
                                params: {
                                    screen: "AgendarCita",
                                    params: { inmueble, token }
                                }
                            })
                        }}
                    >
                        <MaterialCommunityIcons name="calendar" size={18} color="#fff"/>
                        <Text style={styles.btnContactoTexto}>Agendar Cita</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.btnContacto}
                    onPress={() => setModalTarifaVisible(true)}
                >
                    <MaterialCommunityIcons name="phone" size={18} color="#fff"/>
                    <Text style={styles.btnContactoTexto}>Contactar</Text>
                </TouchableOpacity>
            </View>

            {/* Modal de Confirmar Renta */}
            <Modal visible={modalRentarVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <MaterialCommunityIcons name="key-variant" size={48} color="#205EA6" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitle}>Confirmar Renta</Text>
                        <Text style={styles.modalText}>
                            Estás a punto de rentar {inmueble?.titulo} por ${(Number(inmueble?.precio_mensual) || 0).toLocaleString('es-MX')} MXN al mes. ¿Deseas proceder al pago?
                        </Text>
                        <TouchableOpacity
                            style={styles.btnPagar}
                            onPress={() => {
                                setModalRentarVisible(false)
                                navigation.navigate("PaymentScreen", {
                                    token: token,
                                    monto: Number(inmueble?.precio_mensual) || 0,
                                    tipo: "renta",
                                    id_inmueble: inmueble?.id_inmueble,
                                    titulo_inmueble: inmueble?.titulo,
                                })
                            }}
                        >
                            <Text style={styles.btnPagarTexto}>Proceder al Pago</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalRentarVisible(false)}>
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de Tarifa de Servicio */}
            <Modal visible={modalTarifaVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <MaterialCommunityIcons name="shield-check" size={48} color="#205EA6" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitle}>Tarifa de Contacto</Text>
                        <Text style={styles.modalText}>
                            Para proteger a nuestra comunidad y garantizar un servicio de calidad, cobramos una pequeña tarifa de $50 MXN para contactar a este arrendador.
                        </Text>
                        <TouchableOpacity
                            style={styles.btnPagar}
                            onPress={() => {
                                setModalTarifaVisible(false)
                                navigation.navigate("PaymentScreen", { token: token })
                            }}
                        >
                            <Text style={styles.btnPagarTexto}>Entendido, proceder al pago</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalTarifaVisible(false)}>
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

export default InmuebleScreen

// ─ Estilos ─
const styles = StyleSheet.create({
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
    videoPlaceholder: {
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
    },
    videoPlaceholderText: {
        color: "#fff",
        marginTop: 10,
        fontSize: 12,
    },
    btnCerrar: {
        position: "absolute",
        left: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 5,
        zIndex: 10,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    btnFavorito: {
        position: "absolute",
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 5,
        zIndex: 10,
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
    sinReseñas: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        justifyContent: "center",
        paddingVertical: 8,
    },
    sinReseñasTxt: {
        fontSize: 14,
        color: "#aaa",
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
    btnRentarDisabled: {
        flexDirection: "row",
        backgroundColor: "#EEF4FF",
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        gap: 8,
    },
    btnRentarDisabledTexto: {
        color: "#a0b9e9",
        fontWeight: "600",
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 32,
        alignItems: "center",
        width: "100%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#0F2C4F",
        marginBottom: 12,
    },
    modalText: {
        fontSize: 15,
        color: "#666",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 24,
    },
    btnPagar: {
        backgroundColor: "#205EA6",
        width: "100%",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 12,
    },
    btnPagarTexto: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    btnCancelar: {
        padding: 12,
    },
    btnCancelarTexto: {
        color: "#888",
        fontWeight: "600",
        fontSize: 15,
    }
})