// ─ Importes ─
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState, useRef, useEffect } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"
import { useNavigation } from "@react-navigation/native"

// ─ Constantes ─
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

// Foto del anfitrion provisional
const ANFITRION = require("../default_images/anfi.jpg")

// Comentarios preestablecidos
const COMENTARIOS_INICIALES = [
    { autor: "Ana G.", texto: "Muy buen lugar, limpio y tranquilo.", fecha: "12 de enero de 2025 a las 3:25 p.m." },
    { autor: "Carlos M.", texto: "Excelente ubicación, el anfitrión muy amable.", fecha: "3 de febrero de 2025 a las 8:46 a.m." },
    { autor: "Sofía R.", texto: "Todo como se describe, lo recomiendo.", fecha: "28 de marzo de 2025 a las 2:07 p.m." },
]

// ─ Tipos ─
type Comentario = { autor: string, texto: string, fecha: string }

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
    const playerRef = useRef<any>(null)

    // 👇 Validación después de TODOS los hooks, pero antes de usar hooks condicionales
    const esVideo = inmueble?.media?.[imagenActual]?.tipo === "video"
    const videoSource = esVideo ? inmueble?.media?.[imagenActual]?.src : null

    // Solo crear el player si hay video y el modal está visible
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

    // Si no hay inmueble, no mostrar nada
    if (!inmueble) return null

    const [favorito, setFavorito] = useState(false)
    const [imagenActual, setImagenActual] = useState(0)
    const [miCalificacion, setMiCalificacion] = useState(0)
    const [comentarios, setComentarios] = useState<Comentario[]>(COMENTARIOS_INICIALES)
    const [nuevoComentario, setNuevoComentario] = useState("")
    const [modalTarifaVisible, setModalTarifaVisible] = useState(false)

    const agregarComentario = () => {
        if (nuevoComentario.trim() === "") return
        const fecha = new Date().toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        })
        setComentarios([{ autor: "Tú", texto: nuevoComentario, fecha }, ...comentarios])
        setNuevoComentario("")
    }

    const renderMedia = (item, index) => {
        if (item.tipo === "imagen") {
            return (
                <Image 
                    key={index} 
                    source={item.src} 
                    style={styles.imagenPrincipal}
                    resizeMode="cover"
                />
            )
        } else {
            // Solo mostrar VideoView si el video es el actual y es visible
            if (index === imagenActual && visible && videoSource) {
                return (
                    <VideoView
                        key={index}
                        player={player}
                        style={styles.imagenPrincipal}
                        contentFit="cover"
                        nativeControls
                    />
                )
            } else {
                // Placeholder mientras no está activo
                return (
                    <View key={index} style={[styles.imagenPrincipal, styles.videoPlaceholder]}>
                        <MaterialCommunityIcons name="play-circle" size={50} color="#fff" />
                        <Text style={styles.videoPlaceholderText}>Video preview</Text>
                    </View>
                )
            }
        }
    }

    return(
        <View style={styles.container}>
            {/* Botones estáticos superiores */}
            <TouchableOpacity 
                style={[styles.btnCerrar, { top: insets.top + 16 }]} 
                onPress={onClose}
            >
                <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.btnFavorito, { top: insets.top + 16 }]} 
                onPress={() => setFavorito(!favorito)}
            >
                <MaterialCommunityIcons 
                    name={favorito ? "heart" : "heart-outline"} 
                    size={26} 
                    color={favorito ? "#e74c3c" : "#1a1a2e"}
                />
            </TouchableOpacity>

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
                        {inmueble.media?.map((item, i) => renderMedia(item, i))}
                    </ScrollView>

                    {/* Miniaturas */}
                    {inmueble.media?.length > 1 && (
                        <View style={styles.miniaturas}>
                            {inmueble.media.map((item, i) => (
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
                    )}
                </View>

                {/* Informacion Principal */}
                <View style={styles.info}>
                    {/* Titulo */}
                    <Text style={styles.titulo}>{inmueble.titulo}</Text>
                    
                    {/* Calificaciones */}
                    <View style={styles.calificacionContainer}>
                        <View style={styles.calificacionItem}>
                            <Text style={styles.calificacionNumero}>{inmueble.calificacion} <MaterialCommunityIcons
                                            name={"star"}
                                            size={25}
                                            color="#f39c12"/></Text>
                            {/* <View style={styles.estrellas}>
                                {[1, 2, 3, 4, 5].map((i)=>(
                                    <TouchableOpacity key={i} onPress={() => setMiCalificacion(i)}>
                                        <MaterialCommunityIcons
                                            name={i <= miCalificacion ? "star" : "star-outline"}
                                            size={25}
                                            color="#f39c12"/>
                                    </TouchableOpacity>
                                ))}
                            </View> */}
                        </View>

                        <View style={styles.calificacionItem}>
                            <Text style={styles.calificacionNumero}>{inmueble.opiniones}</Text>
                            <Text style={styles.opinionesLabel}>opiniones</Text>
                        </View>
                    </View>

                    <View style={styles.divider}/>

                    {/* Anfitrion */}
                    <View style={styles.anfitrionRow}>
                        <Image source={ANFITRION} style={styles.avatarImagen}/>
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
                        {inmueble.servicios?.map((s, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagTexto}>{s}</Text>
                            </View>
                        ))}
                    </View>
                    
                    <View style={styles.divider}/>

                    {/* Reglas */}
                    <Text style={styles.subtitulo}>Reglas de la casa</Text>
                    <View style={styles.tags}>
                        {inmueble.reglas?.map((r, i) => (
                            <View key={i} style={[styles.tag, styles.tagRegla]}>
                                <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{r}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider}/>

                    {/* Nuevo comentario */}
                    {/* <View style={styles.inputComentarioContainer}>
                        <TextInput
                            style={styles.inputComentario}
                            placeholder="Escribe tu comentario..."
                            placeholderTextColor="#aaa"
                            value={nuevoComentario}
                            onChangeText={setNuevoComentario}
                            multiline/>
                        <TouchableOpacity style={styles.btnEnviar} onPress={agregarComentario}>
                            <MaterialCommunityIcons name="send" size={20} color="#fff"/>
                        </TouchableOpacity>
                    </View> */}

                    {/* Comentarios */}
                    {comentarios.map((c, i) => (
                        <View key={i} style={styles.comentario}>
                            <Image source={ANFITRION} style={styles.comentarioAvatar}/>
                            <View style={{flex: 1}}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                    <Text style={styles.comentarioAutor}>{c.autor}</Text>
                                    <Text style={{ fontSize: 11, color: "#aaa" }}>{c.fecha}</Text>
                                </View>
                                <Text style={styles.comentarioTexto}>{c.texto}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerPrecio}>${inmueble.precio.toLocaleString('es-MX')}</Text>
                    <Text style={styles.footerMes}>/ mes</Text>
                </View>
                <TouchableOpacity style={styles.btnContacto} onPress={() => setModalTarifaVisible(true)}>
                    <MaterialCommunityIcons name="phone" size={18} color="#fff"/>
                    <Text style={styles.btnContactoTexto}>Contactar</Text>
                </TouchableOpacity>
            </View>

            {/* Modal de Tarifa de Servicio (Mantenemos este como modal interno) */}
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
                                setModalTarifaVisible(false);
                                navigation.navigate("PaymentScreen", { token: token }); // Redirige a la pantalla de pagos
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
    inputComentarioContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 20,
    },
    inputComentario: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#1a1a2e",
    },
    btnEnviar: {
        backgroundColor: "#205EA6",
        borderRadius: 25,
        padding: 15,
        justifyContent: "center",
        alignItems: "center",
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