import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Modal, Dimensions } from "react-native"
import { useState, useRef, useEffect } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window")
const ANFITRION = require("../default_images/anfi.jpg")

const RENTA_ACTIVA = {
    titulo: "Departamento Centro Morelia",
    arrendador: "Stevenson",
    precio: 3200,
    ubicacion: "Centro Histórico, Morelia",
    servicios: ["WiFi incluido", "Agua incluida", "Luz incluida", "Lavadora", "Estacionamiento"],
    reglas: ["No mascotas", "No fumar", "No fiestas", "Máx. 2 personas"],
    contactoTel: "55 1234 5678",
    contactoEmail: "stevenson@mail.com",
    fechaInicio: "1 de abril de 2026",
    fechaFin: "1 de octubre de 2026",
    diasRestantes: 157,
    diasTotales: 183,
    media: [
        { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
        { tipo: "imagen", src: require("../default_images/fachada.jpg") },
        { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
        { tipo: "video", src: require("../default_images/twt.mp4") },
    ]
}

const GaleriaVideoItem = ({ src }: { src: any }) => {
    const player = useVideoPlayer(src)
    return (
        <VideoView
            player={player}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6 }}
            allowsFullscreen
        />
    )
}



type Props = { navigation?: any }

const HomeScreen = ({ navigation }: Props) => {

    const insets = useSafeAreaInsets()
    const [imagenActual, setImagenActual] = useState(0)
    const [menuVisible, setMenuVisible] = useState(false)
    const [modalCancelarVisible, setModalCancelarVisible] = useState(false)
    const [galeriaVisible, setGaleriaVisible] = useState(false)
    const [mediaActual, setMediaActual] = useState(0)

    const player = useVideoPlayer(
        RENTA_ACTIVA.media[imagenActual].tipo === "video" ? RENTA_ACTIVA.media[imagenActual].src : null
    )
    
    const galeriaScrollRef = useRef<ScrollView>(null)
    
    useEffect(() => {
    if (galeriaVisible) {
        setTimeout(() => {
            galeriaScrollRef.current?.scrollTo({ x: mediaActual * SCREEN_WIDTH, animated: false })
        }, 50)
    }
}, [galeriaVisible])

// Salta cuando tocas una miniatura dentro de la galería
useEffect(() => {
    if (galeriaVisible) {
        galeriaScrollRef.current?.scrollTo({ x: mediaActual * SCREEN_WIDTH, animated: true })
    }
}, [mediaActual])

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

                {/* Header con imagen de fondo */}
                <View style={styles.headerAzul}>
                    <TouchableOpacity 
                        style={{ position: "absolute", width: "100%", height: "100%" }}
                        onPress={() => { setMediaActual(0); setGaleriaVisible(true) }}
                        activeOpacity={0.9}
                    >
                        <Image source={RENTA_ACTIVA.media[0].src} style={styles.headerImagen} />
                    </TouchableOpacity>
                
                    <View style={styles.headerOverlay} />
                    <View style={styles.headerContenido}>
                        <View style={styles.headerTopRow}>
                            <Text style={styles.headerLbl}>Mi renta actual</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={styles.badge}>
                                    <View style={styles.badgeDot} />
                                    <Text style={styles.badgeTxt}>Activa</Text>
                                </View>
                                <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
                                    <MaterialCommunityIcons name="dots-vertical" size={25} color="rgba(255,255,255,1)" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={styles.headerTitulo}>{RENTA_ACTIVA.titulo}</Text>
                        <Text style={styles.headerSub}>
                            ${RENTA_ACTIVA.precio.toLocaleString("es-MX")} / mes · {RENTA_ACTIVA.ubicacion}
                        </Text>
                    </View>

                    {/* Menú desplegable */}
                    {menuVisible && (
                        <View style={styles.menuDesplegable}>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setMenuVisible(false)
                                    setModalCancelarVisible(true)
                                }}
                            >
                                <MaterialCommunityIcons name="delete-outline" size={15} color="#A32D2D" />
                                <Text style={styles.menuItemTxt}>Cancelar contrato de renta</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.body}>

                    {/* Miniaturas */}
                    <View style={styles.galeriaRow}>
                        {RENTA_ACTIVA.media.slice(1, 3).map((item, i) => (
                            <TouchableOpacity key={i} style={{ flex: 1 }} onPress={() => { setMediaActual(i + 1); setGaleriaVisible(true) }}>
                                {item.tipo === "imagen" ? (
                                    <Image source={item.src} style={styles.imgMiniatura} />
                                ) : (
                                    <View style={[styles.imgMiniatura, styles.imgSmVideo]}>
                                        <MaterialCommunityIcons name="play-circle" size={22} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    {/* Contrato */}
                    <View style={styles.cardVacio}>
                        <Text style={styles.cardLbl}>Contrato</Text>
                        <View style={styles.timeline}>

                            <View style={styles.tlItem}>
                                <View style={styles.tlLeft}>
                                    <View style={styles.tlDot} />
                                    <View style={styles.tlLinea} />
                                </View>
                                <View style={styles.tlContent}>
                                    <Text style={styles.tlLbl}>Inicio</Text>
                                    <Text style={styles.tlVal}>{RENTA_ACTIVA.fechaInicio}</Text>
                                </View>
                            </View>

                            <View style={styles.tlItem}>
                                <View style={styles.tlLeft}>
                                    <View style={[styles.tlDot, styles.tlDotFin]} />
                                </View>
                                <View style={styles.tlContent}>
                                    <Text style={styles.tlLbl}>Fin</Text>
                                    <Text style={styles.tlVal}>{RENTA_ACTIVA.fechaFin}</Text>
                                    <View style={styles.tlPill}>
                                        <MaterialCommunityIcons name="clock-outline" size={11} color="#205EA6" />
                                        <Text style={styles.tlPillTxt}>{RENTA_ACTIVA.diasRestantes} días restantes</Text>
                                    </View>
                                </View>
                            </View>

                        </View>
                    </View>

                    {/* Arrendador */}
                    <View style={styles.cardDouble}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardLbl}>Arrendador</Text>
                            <View style={styles.arrenRow}>
                                <Image source={ANFITRION} style={styles.avatar} />
                                <View>
                                    <Text style={styles.arrenNombre}>{RENTA_ACTIVA.arrendador}</Text>
                                    <Text style={styles.arrenSub}>Arrendador verificado</Text>
                                </View>
                            </View>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                            <Text style={[styles.cardLbl, styles.contactarLbl]}>Contactar:</Text>
                            <Text style={styles.contactarVal}>{RENTA_ACTIVA.contactoTel}</Text>
                            <Text style={styles.contactarVal}>{RENTA_ACTIVA.contactoEmail}</Text>
                        </View>
                    </View>

                    {/* Servicios */}
                    <View style={styles.card}>
                        <Text style={styles.cardLbl}>Servicios incluidos</Text>
                        <View style={styles.chips}>
                            {RENTA_ACTIVA.servicios.map((s, i) => (
                                <View key={i} style={styles.chip}>
                                    <Text style={styles.chipTxt}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Reglas */}
                    <View style={styles.card}>
                        <Text style={styles.cardLbl}>Reglas de la vivienda</Text>
                        <View style={styles.chips}>
                            {RENTA_ACTIVA.reglas.map((r, i) => (
                                <View key={i} style={[styles.chip, styles.chipRegla]}>
                                    <Text style={[styles.chipTxt, styles.chipTxtRegla]}>{r}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                </View>
            </ScrollView>

            {/* Galeria modal */}
            <Modal visible={galeriaVisible} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" }}>

                    {/* Botón cerrar */}
                    <TouchableOpacity
                        onPress={() => setGaleriaVisible(false)}
                        style={{ position: "absolute", top: insets.top + 16, right: 16, zIndex: 10 }}
                    >
                        <MaterialCommunityIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>

                    {/* Contador */}
                    <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center",
                        position: "absolute", top: insets.top + 20, alignSelf: "center", fontSize: 13 }}>
                        {mediaActual + 1} / {RENTA_ACTIVA.media.length}
                    </Text>

                    {/* Media principal */}
                    <ScrollView
                        ref={galeriaScrollRef}
                        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                            setMediaActual(idx)
                        }}
                    >
                        {RENTA_ACTIVA.media.map((item, i) => (
                            <View key={i} style={{ width: SCREEN_WIDTH, justifyContent: "center", alignItems: "center" }}>
                                {item.tipo === "imagen" ? (
                                    <Image source={item.src} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6, resizeMode: "contain" }} />
                                ) : (
                                    <GaleriaVideoItem src={item.src} />
                                )}
                            </View>
                        ))}
                    </ScrollView>

                    {/* Miniaturas abajo */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        style={{ position: "absolute", bottom: insets.bottom + 20 }}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    >
                        {RENTA_ACTIVA.media.map((item, i) => (
                            <TouchableOpacity key={i} onPress={() => setMediaActual(i)}>
                                {item.tipo === "imagen" ? (
                                    <Image source={item.src} style={{
                                        width: 56, height: 56, borderRadius: 8, resizeMode: "cover",
                                        borderWidth: mediaActual === i ? 2 : 0, borderColor: "#fff"
                                    }} />
                                ) : (
                                    <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: "#1a1a2e",
                                        justifyContent: "center", alignItems: "center",
                                        borderWidth: mediaActual === i ? 2 : 0, borderColor: "#fff" }}>
                                        <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                </View>
            </Modal>

            {/* Modal cancelar contrato */}
            <Modal visible={modalCancelarVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>

                        <View style={styles.modalIcono}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#ffffff" />
                        </View>

                        <Text style={styles.modalTitulo}>¿Cancelar contrato?</Text>
                        <Text style={styles.modalSubtitulo}>
                            Esta acción cancelará tu contrato activo. No podrás deshacerlo una vez enviada la solicitud.
                        </Text>

                        <TouchableOpacity
                            style={styles.modalBtnPeligro}
                            onPress={() => {
                                setModalCancelarVisible(false)
                                // aquí va la lógica real cuando conectes la API
                            }}
                        >
                            <Text style={styles.modalBtnPeligroTxt}>Sí, cancelar contrato</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalBtnVolver}
                            onPress={() => setModalCancelarVisible(false)}
                        >
                            <Text style={styles.modalBtnVolverTxt}>Volver</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>

        </View>
    )
}

export default HomeScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
    },

    // ── Header ──
    headerAzul: {
        height: SCREEN_HEIGHT * 0.32,
        backgroundColor: "#1477e9",
        overflow: "hidden",
    },
    headerImagen: {
        position: "absolute",
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    headerOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "#2a558891",
        opacity: 0.55,
    },
    headerContenido: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    headerLbl: {
        fontSize: 16,
        color: "rgba(255,255,255,0.80)",
        fontWeight: "700",
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "rgba(255,255,255,0.25)",
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 9,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#4ade80",
    },
    badgeTxt: {
        fontSize: 15,
        color: "#fff",
        fontWeight: "600",
    },
    headerTitulo: {
        fontSize: 25,
        fontWeight: "800",
        color: "#fff",
        marginBottom: 4,
    },
    headerSub: {
        fontSize: 15,
        color: "rgba(255,255,255,0.85)",
    },

    // ── Menú ──
    menuDesplegable: {
        position: "absolute",
        top: 44,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 10,
        paddingVertical: 6,
        borderWidth: 0.5,
        borderColor: "#e8ecf0",
        zIndex: 100,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    menuItemTxt: {
        fontSize: 13,
        color: "#A32D2D",
        fontWeight: "600",
    },

    // ── Body ──
    body: {
        backgroundColor: "#f5f7fa",
        borderRadius: 20,
        marginTop: -12,
        padding: 14,
        gap: 10,
    },

    // ── Galería ──
    galeriaRow: {
        flexDirection: "row",
        gap: 6,
    },
    imgMiniatura: {
        //flex: 1,
        height: 150,
        width: "100%",
        borderRadius: 10,
        resizeMode: "cover",
    },
    imgSmVideo: {
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
    },

    // ── Cards ──
    cardVacio: {
        padding: 14,
        gap: 8,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        gap: 8,
        borderWidth: 0.5,
        borderColor: "#e8ecf0",
    },
    cardDouble: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        borderWidth: 0.5,
        borderColor: "#e8ecf0",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
    },
    cardLbl: {
        fontSize: 15,
        fontWeight: "700",
        color: "#888",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 10,
    },

    // ── Timeline ──
    timeline: {
        gap: 0,
    },
    tlItem: {
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
    },
    tlLeft: {
        alignItems: "center",
        width: 16,
        flexShrink: 0,
        marginTop: 2,
    },
    tlDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#205EA6",
    },
    tlDotFin: {
        backgroundColor: "#f5f7fa",
        borderWidth: 2,
        borderColor: "#205EA6",
    },
    tlLinea: {
        width: 2,
        flex: 1,
        backgroundColor: "#a0b9e9",
        minHeight: 30,
    },
    tlContent: {
        paddingBottom: 14,
        flex: 1,
    },
    tlLbl: {
        fontSize: 11,
        color: "#888",
        fontWeight: "700",
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    tlVal: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1a1a2e",
        marginTop: 2,
        textTransform: "capitalize",
    },
    tlPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#EEF4FF",
        borderRadius: 20,
        paddingVertical: 3,
        paddingHorizontal: 8,
        alignSelf: "flex-start",
        marginTop: 6,
    },
    tlPillTxt: {
        fontSize: 11,
        color: "#205EA6",
        fontWeight: "700",
    },

    // ── Arrendador ──
    arrenRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    arrenNombre: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    arrenSub: {
        fontSize: 11,
        color: "#888",
    },
    contactarLbl: {
        color: "#888",
        marginBottom: 4,
    },
    contactarVal: {
        fontSize: 12,
        color: "#185FA5",
        fontWeight: "600",
    },

    // ── Chips ──
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        backgroundColor: "#EEF4FF",
        borderRadius: 20,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    chipTxt: {
        fontSize: 12,
        color: "#205EA6",
        fontWeight: "600",
    },
    chipRegla: {
        backgroundColor: "#FFF0F0",
    },
    chipTxtRegla: {
        color: "#b83e31",
    },

    // ── Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        width: "80%",
        alignItems: "center",
        gap: 10,
    },
    modalIcono: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#A32D2D",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    modalSubtitulo: {
        fontSize: 13,
        color: "#666",
        textAlign: "center",
        lineHeight: 20,
    },
    modalBtnPeligro: {
        backgroundColor: "#A32D2D",
        borderRadius: 12,
        paddingVertical: 13,
        paddingHorizontal: 24,
        width: "80%",
        alignItems: "center",
        //borderWidth: 0.5,
        //borderColor: "#A32D2D",
        marginTop: 6,
    },
    modalBtnPeligroTxt: {
        fontSize: 14,
        fontWeight: "700",
        color: "#ffffff",
    },
    modalBtnVolver: {
        paddingVertical: 10,
    },
    modalBtnVolverTxt: {
        fontSize: 13,
        color: "#888",
        fontWeight: "600",
    },
})