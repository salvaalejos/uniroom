// ─ Importes ─
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, Animated } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState, useRef, useEffect } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"
import { BlurView } from "expo-blur"
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

// ─ Componente ─
const InmuebleScreen = ({ visible: propVisible, onClose: propOnClose, inmueble: propInmueble, token: propToken, route }: any) => {
    const navigation = useNavigation<any>()
    const insets = useSafeAreaInsets()
    
    // 1. Obtener parámetros unificados
    const inmueble = route?.params?.inmueble || propInmueble
    const token = route?.params?.token || propToken
    const isModal = !route?.params
    const visible = isModal ? propVisible : true
    const onClose = isModal ? propOnClose : () => navigation.goBack()

    // 2. Todos los Hooks de Estado y Refs al principio
    const [favorito, setFavorito] = useState(false)
    const [imagenActual, setImagenActual] = useState(0)
    const [comentarios, setComentarios] = useState<Comentario[]>(COMENTARIOS_INICIALES)
    const [nuevoComentario, setNuevoComentario] = useState("")
    const [modalTarifaVisible, setModalTarifaVisible] = useState(false)
    
    const scrollRef = useRef<ScrollView>(null)
    const scrollY = useRef(new Animated.Value(0)).current

    // 3. Lógica de Video
    const esVideo = inmueble?.media?.[imagenActual]?.tipo === "video"
    const videoSource = esVideo ? inmueble?.media?.[imagenActual]?.src : null

    const player = useVideoPlayer(videoSource, p => {
        if (p && videoSource && visible) {
            p.loop = true
            p.play()
        }
    })

    useEffect(() => {
        if (!visible && player) {
            player.pause()
        }
    }, [visible, player])

    useEffect(() => {
        if (!visible || !player) return
        
        if (esVideo && videoSource) {
            player.play()
        } else {
            player.pause()
        }
    }, [imagenActual, esVideo, player, videoSource, visible])

    // 4. Animaciones de Header
    const headerOpacity = scrollY.interpolate({
        inputRange: [SCREEN_HEIGHT * 0.2, SCREEN_HEIGHT * 0.3],
        outputRange: [0, 1],
        extrapolate: "clamp"
    })

    const buttonsOpacity = scrollY.interpolate({
        inputRange: [SCREEN_HEIGHT * 0.2, SCREEN_HEIGHT * 0.3],
        outputRange: [1, 0],
        extrapolate: "clamp"
    })

    if (!inmueble) return null

    const renderMedia = (item: any, index: number) => {
        if (item.tipo === "imagen") {
            return (
                <Image 
                    key={index} 
                    source={item.src} 
                    style={styles.imagenPrincipal}
                    resizeMode="cover"
                />
            )
        }
        
        return (
            <View key={index} style={styles.imagenPrincipal}>
                <View style={[StyleSheet.absoluteFill, styles.videoPlaceholder]}>
                    <MaterialCommunityIcons name="play-circle" size={80} color="rgba(255,255,255,0.8)" />
                    <Text style={{ color: '#fff', marginTop: 10, fontWeight: '600' }}>Vista previa de video</Text>
                </View>
            </View>
        )
    }

    const content = (
        <View style={styles.container}>
            {/* Header Animado (Fondo Blur) */}
            <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top + 10 }]}>
                <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}/>
                <Text style={styles.headerTitle} numberOfLines={1}>{inmueble.titulo}</Text>
            </Animated.View>

            {/* Botones Flotantes Superiores */}
            <Animated.View style={[styles.botonesFlotantes, { top: insets.top + 10, opacity: buttonsOpacity }]}>
                <TouchableOpacity style={styles.btnFlotante} onPress={onClose}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnFlotante} onPress={() => setFavorito(!favorito)}>
                    <MaterialCommunityIcons name={favorito ? "heart" : "heart-outline"} size={26} color={favorito ? "#e74c3c" : "#1a1a2e"}/>
                </TouchableOpacity>
            </Animated.View>

            {/* Botones fijados para cuando el header es visible */}
            <Animated.View style={[styles.botonesFlotantes, { top: insets.top + 10, opacity: headerOpacity, zIndex: 20 }]}>
                <TouchableOpacity style={styles.btnCerrarHeader} onPress={onClose}>
                    <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnFavoritoHeader} onPress={() => setFavorito(!favorito)}>
                    <MaterialCommunityIcons name={favorito ? "heart" : "heart-outline"} size={26} color={favorito ? "#e74c3c" : "#1a1a2e"}/>
                </TouchableOpacity>
            </Animated.View>

            <ScrollView 
                bounces={false} 
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
            >
                {/* Galeria */}
                <View style={styles.galeriaContainer}>
                    <ScrollView 
                        ref={scrollRef} 
                        horizontal 
                        pagingEnabled 
                        showsHorizontalScrollIndicator={false} 
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                            setImagenActual(index)
                        }}
                    >
                        {inmueble.media?.map((item: any, i: number) => renderMedia(item, i))}
                    </ScrollView>

                    {/* Miniaturas */}
                    {inmueble.media?.length > 1 && (
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
                                            <MaterialCommunityIcons name="play-circle" size={24} color="#fff"/>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Informacion Principal */}
                <View style={styles.info}>
                    <Text style={styles.titulo}>{inmueble.titulo}</Text>
                    
                    <View style={styles.calificacionContainer}>
                        <View style={styles.calificacionItem}>
                            <Text style={styles.calificacionNumero}>
                                {inmueble.calificacion} <MaterialCommunityIcons name="star" size={22} color="#f39c12"/>
                            </Text>
                            <Text style={styles.opinionesLabel}>{inmueble.opiniones} opiniones</Text>
                        </View>
                    </View>

                    <View style={styles.divider}/>

                    <View style={styles.anfitrionRow}>
                        <Image source={ANFITRION} style={styles.avatarImagen}/>
                        <View>
                            <Text style={styles.anfitrionLabel}>Anfitrión</Text>
                            <Text style={styles.anfitrionNombre}>{inmueble.anfitrion}</Text>
                        </View>
                    </View>

                    <View style={styles.divider}/>

                    <View style={styles.seccion}>
                        <MaterialCommunityIcons name="map-marker" size={18} color="#205EA6" />
                        <Text style={styles.seccionTexto}>{inmueble.ubicacion}</Text>
                    </View>

                    <View style={styles.divider}/>

                    <Text style={styles.descripcion}>{inmueble.descripcion}</Text>
                    
                    <View style={styles.divider}/>

                    <Text style={styles.subtitulo}>Servicios incluidos</Text>
                    <View style={styles.tags}>
                        {inmueble.servicios?.map((s: string, i: number) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagTexto}>{s}</Text>
                            </View>
                        ))}
                    </View>
                    
                    <View style={styles.divider}/>

                    <Text style={styles.subtitulo}>Reglas de la casa</Text>
                    <View style={styles.tags}>
                        {inmueble.reglas?.map((r: string, i: number) => (
                            <View key={i} style={[styles.tag, styles.tagRegla]}>
                                <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{r}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View>
                    <Text style={styles.footerPrecio}>${inmueble.precio?.toLocaleString('es-MX')}</Text>
                    <Text style={styles.footerMes}>/ mes</Text>
                </View>
                <TouchableOpacity style={styles.btnContacto} onPress={() => setModalTarifaVisible(true)}>
                    <MaterialCommunityIcons name="phone" size={18} color="#fff"/>
                    <Text style={styles.btnContactoTexto}>Contactar</Text>
                </TouchableOpacity>
            </View>

            {/* Modal de Tarifa */}
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
                                navigation.navigate("PaymentScreen", { token: token });
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

    if (isModal) {
        return (
            <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
                {content}
            </Modal>
        )
    }

    return content
}

export default InmuebleScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    header: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 15,
        height: 100,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 60,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    botonesFlotantes: {
        position: "absolute",
        left: 0,
        right: 0,
        zIndex: 20,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    btnFlotante: {
        backgroundColor: "rgba(255,255,255,0.9)",
        borderRadius: 20,
        padding: 8,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    btnCerrarHeader: {
        padding: 8,
    },
    btnFavoritoHeader: {
        padding: 8,
    },
    galeriaContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.4,
    },
    imagenPrincipal: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.4,
        backgroundColor: "#eee",
    },
    videoPlaceholder: {
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
    },
    miniaturas: {
        flexDirection: "row",
        position: "absolute",
        bottom: 15,
        alignSelf: "center",
        backgroundColor: "rgba(255,255,255,0.7)",
        padding: 6,
        borderRadius: 12,
        gap: 8,
    },
    miniatura: {
        width: 40,
        height: 30,
        borderRadius: 4,
        opacity: 0.5,
    },
    miniaturaVideo: {
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
    },
    miniaturaActiva: {
        opacity: 1,
        borderWidth: 1.5,
        borderColor: "#205EA6",
    },
    info: {
        padding: 20,
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
    },
    titulo: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1a1a2e",
        marginBottom: 10,
    },
    calificacionContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    calificacionItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    calificacionNumero: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    opinionesLabel: {
        fontSize: 14,
        color: "#666",
        textDecorationLine: "underline",
    },
    divider: {
        height: 1,
        backgroundColor: "#f0f0f0",
        marginVertical: 20,
    },
    anfitrionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarImagen: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    anfitrionLabel: {
        fontSize: 12,
        color: "#888",
    },
    anfitrionNombre: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    seccion: {
        flexDirection: "row",
        gap: 10,
    },
    seccionTexto: {
        flex: 1,
        fontSize: 15,
        color: "#444",
        lineHeight: 22,
    },
    descripcion: {
        fontSize: 15,
        color: "#555",
        lineHeight: 24,
    },
    subtitulo: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 12,
    },
    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        backgroundColor: "#F0F4F8",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    tagTexto: {
        fontSize: 14,
        color: "#205EA6",
        fontWeight: "600",
    },
    tagRegla: {
        backgroundColor: "#FFF0F0",
    },
    tagTextoRegla: {
        color: "#b83e31",
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: "#f0f0f0",
        backgroundColor: "#fff",
    },
    footerPrecio: {
        fontSize: 22,
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
        borderRadius: 25,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: "center",
        gap: 8,
        elevation: 4,
    },
    btnContactoTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 28,
        padding: 30,
        alignItems: "center",
        width: "100%",
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#1a1a2e",
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
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 10,
    },
    btnPagarTexto: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    btnCancelar: {
        padding: 10,
    },
    btnCancelarTexto: {
        color: "#999",
        fontWeight: "600",
    }
})