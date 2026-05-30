import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Modal, Dimensions, ActivityIndicator, TextInput } from "react-native"
import { useState, useRef, useEffect, useCallback } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useTheme } from "../context/ThemeContext"
import { useCustomAlert } from "../context/AlertContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { obtenerRentaActual, cancelarRenta, crearCalificacion } from "../services/api"
import { socketService } from "../services/websocketService"
import { API_BASE_URL } from "../config"
import { getMediaUri } from "../utils/getMediaUri"
import { GaleriaVideoItem } from "../components/GaleriaVideoItem"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window")
const ANFITRION = require("../default_images/anfi.jpg")

const HomeScreen = ({ navigation, route }: { navigation?: any; route?: any }) => {
    const insets = useSafeAreaInsets()
    const { colors, isDark } = useTheme()
    const { showAlert } = useCustomAlert()
    
    const userId = route?.params?.userId
    const token = route?.params?.token
    const queryClient = useQueryClient()

    const [imagenActual, setImagenActual] = useState(0)
    const [menuVisible, setMenuVisible] = useState(false)
    const [modalCancelarVisible, setModalCancelarVisible] = useState(false)
    const [galeriaVisible, setGaleriaVisible] = useState(false)
    const [mediaActual, setMediaActual] = useState(0)
    const [cancelando, setCancelando] = useState(false)
    const [modalCalificacionVisible, setModalCalificacionVisible] = useState(false)
    const [modalOmitirVisible, setModalOmitirVisible] = useState(false)
    const [rating, setRating] = useState(0)
    const [comentario, setComentario] = useState("")
    const [enviando, setEnviando] = useState(false)

    const { data: rentaActual, isLoading: cargando } = useQuery({
        queryKey: ['rentaActual', userId],
        queryFn: async () => {
            let currentUserId = userId
            if (!currentUserId) {
                currentUserId = await AsyncStorage.getItem('userId')
            }
            if (!currentUserId) return null
            const data = await obtenerRentaActual(currentUserId)
            return data.rentaActual
        },
        enabled: !!userId,
    })

    const media = rentaActual?.media || []

    const mutationCancelar = useMutation({
        mutationFn: () => cancelarRenta(userId),
        onMutate: () => setCancelando(true),
        onSuccess: () => {
            setModalCancelarVisible(false)
            setRating(0)
            setComentario("")
            setModalCalificacionVisible(true)
        },
        onError: (error: any) => {
            showAlert({ title: "Error", message: error.message, type: "error" })
        },
        onSettled: () => setCancelando(false),
    })

    const mutationCalificar = useMutation({
        mutationFn: (data: any) => crearCalificacion(data),
        onMutate: () => setEnviando(true),
        onSuccess: () => {
            setModalCalificacionVisible(false)
            setModalOmitirVisible(false)
            queryClient.invalidateQueries({ queryKey: ['rentaActual', userId] })
        },
        onError: (error: any) => {
            console.error("Error enviando calificación:", error)
            queryClient.invalidateQueries({ queryKey: ['rentaActual', userId] })
        },
        onSettled: () => setEnviando(false),
    })

    const galeriaScrollRef = useRef<ScrollView>(null)

    useEffect(() => {
        if (galeriaVisible) {
            setTimeout(() => {
                galeriaScrollRef.current?.scrollTo({ x: mediaActual * SCREEN_WIDTH, animated: false })
            }, 50)
        }
    }, [galeriaVisible])

    useEffect(() => {
        if (galeriaVisible) {
            galeriaScrollRef.current?.scrollTo({ x: mediaActual * SCREEN_WIDTH, animated: true })
        }
    }, [mediaActual])

    const refreshRenta = useCallback(() => {
        if (userId) queryClient.invalidateQueries({ queryKey: ['rentaActual', userId] })
    }, [userId, queryClient])

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', refreshRenta)
        socketService.on('renta_confirmada_estudiante', (data) => {
            console.log("Renta confirmada recibida vía WebSocket:", data)
            refreshRenta()
        })
        return () => {
            unsubscribe()
            socketService.off('renta_confirmada_estudiante')
        }
    }, [userId, navigation, refreshRenta])

    const handleCancelarRenta = () => {
        mutationCancelar.mutate()
    }

    const handleEnviarCalificacion = () => {
        if (rating === 0) {
            setEnviando(false)
            setModalCalificacionVisible(false)
            setModalOmitirVisible(false)
            queryClient.invalidateQueries({ queryKey: ['rentaActual', userId] })
            return
        }
        mutationCalificar.mutate({
            id_inmueble: rentaActual.id_inmueble,
            calificacion: rating,
            comentario: comentario || undefined,
        })
    }

    if (cargando) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.buttonMain || "#205EA6"} />
            </View>
        )
    }

    // Sin renta activa
    if (!rentaActual) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
                <View style={styles.sinRentaContainer}>
                    <MaterialCommunityIcons name="home-outline" size={80} color={isDark ? "#30475e" : "#a0b9e9"} />
                    <Text style={[styles.sinRentaTitulo, { color: colors.textPrimary }]}>No tienes una renta activa</Text>
                    <Text style={[styles.sinRentaSub, { color: colors.textSecondary }]}>Explora el mapa para encontrar tu próximo hogar</Text>
                    <TouchableOpacity
                        style={[styles.btnExplorar, { backgroundColor: colors.buttonMain }]}
                        onPress={() => navigation?.navigate?.("Navigator", { screen: "Inmuebles" })}
                    >
                        <MaterialCommunityIcons name="map-search" size={20} color="#fff" />
                        <Text style={styles.btnExplorarTexto}>Explorar inmuebles</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
                {/* Header con imagen de fondo */}
                <View style={styles.headerAzul}>
                    {media.length > 0 && (
                        <TouchableOpacity
                            style={{ position: "absolute", width: "100%", height: "100%" }}
                            onPress={() => { setMediaActual(0); setGaleriaVisible(true) }}
                            activeOpacity={0.9}
                        >
                            <Image source={getMediaUri(media[0].src)} style={styles.headerImagen} />
                        </TouchableOpacity>
                    )}

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
                        <Text style={styles.headerTitulo}>{rentaActual.titulo}</Text>
                        <Text style={styles.headerSub}>
                            ${rentaActual.precio_mensual.toLocaleString("es-MX")} / mes
                        </Text>
                    </View>

                    {/* Menú desplegable */}
                    {menuVisible && (
                        <View style={[styles.menuDesplegable, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
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

                <View style={[styles.body, { backgroundColor: colors.background }]}>
                    {/* Miniaturas */}
                    {media.length > 1 && (
                        <View style={styles.galeriaRow}>
                            {media.slice(1, 3).map((item: any, i: number) => (
                                <TouchableOpacity key={i} style={{ flex: 1 }} onPress={() => { setMediaActual(i + 1); setGaleriaVisible(true) }}>
                                    {item.tipo === "imagen" ? (
                                        <Image source={getMediaUri(item.src)} style={styles.imgMiniatura} />
                                    ) : (
                                        <View style={[styles.imgMiniatura, styles.imgSmVideo]}>
                                            <MaterialCommunityIcons name="play-circle" size={22} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Contrato */}
                    <View style={styles.cardVacio}>
                        <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Contrato</Text>
                        <View style={styles.timeline}>
                            <View style={styles.tlItem}>
                                <View style={styles.tlLeft}>
                                    <View style={[styles.tlDot, { backgroundColor: colors.buttonMain }]} />
                                    <View style={[styles.tlLinea, { backgroundColor: isDark ? colors.border : "#a0b9e9" }]} />
                                </View>
                                <View style={styles.tlContent}>
                                    <Text style={[styles.tlLbl, { color: colors.textSecondary }]}>Inicio</Text>
                                    <Text style={[styles.tlVal, { color: colors.textPrimary }]}>{rentaActual.fecha_inicio_str}</Text>
                                </View>
                            </View>
                            <View style={styles.tlItem}>
                                <View style={styles.tlLeft}>
                                    <View style={[styles.tlDot, styles.tlDotFin, { borderColor: colors.buttonMain }]} />
                                </View>
                                <View style={styles.tlContent}>
                                    <Text style={[styles.tlLbl, { color: colors.textSecondary }]}>Fin</Text>
                                    <Text style={[styles.tlVal, { color: colors.textPrimary }]}>{rentaActual.fecha_fin_str}</Text>
                                    <View style={[styles.tlPill, { backgroundColor: isDark ? colors.backgroundSecondary : '#EEF4FF' }]}>
                                        <MaterialCommunityIcons name="clock-outline" size={11} color={colors.buttonMain || "#205EA6"} />
                                        <Text style={[styles.tlPillTxt, { color: colors.buttonMain || "#205EA6" }]}>{rentaActual.dias_restantes} días restantes</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Arrendador */}
                    <View style={[styles.cardDouble, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Arrendador</Text>
                            <View style={styles.arrenRow}>
                                {rentaActual.arrendador.foto ? (
                                    <Image
                                        source={{ uri: rentaActual.arrendador.foto.startsWith("http") ? rentaActual.arrendador.foto : `${API_BASE_URL}${rentaActual.arrendador.foto}` }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <Image source={ANFITRION} style={styles.avatar} />
                                )}
                                <View>
                                    <Text style={[styles.arrenNombre, { color: colors.textPrimary }]}>{rentaActual.arrendador.nombre}</Text>
                                    <Text style={[styles.arrenSub, { color: colors.textSecondary }]}>Arrendador verificado</Text>
                                </View>
                            </View>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                            <Text style={[styles.cardLbl, styles.contactarLbl, { color: colors.textSecondary }]}>Contactar:</Text>
                            <Text style={[styles.contactarVal, { color: colors.buttonMain || "#205EA6" }]}>{rentaActual.arrendador.numero_contacto || "Sin teléfono"}</Text>
                        </View>
                    </View>

                    {/* Servicios */}
                    {rentaActual.servicios && rentaActual.servicios.length > 0 && (
                        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Servicios incluidos</Text>
                            <View style={styles.chips}>
                                {rentaActual.servicios.map((s: any, i: number) => (
                                    <View key={i} style={[styles.chip, { backgroundColor: isDark ? colors.backgroundSecondary : '#EEF4FF' }]}>
                                        <Text style={[styles.chipTxt, { color: colors.buttonMain || "#205EA6" }]}>{typeof s === "object" ? s.nombre : s}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Reglas */}
                    {rentaActual.restricciones && rentaActual.restricciones.length > 0 && (
                        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={[styles.cardLbl, { color: colors.textSecondary }]}>Reglas de la vivienda</Text>
                            <View style={styles.chips}>
                                {rentaActual.restricciones.map((r: any, i: number) => (
                                    <View key={i} style={[styles.chip, styles.chipRegla, { backgroundColor: isDark ? '#3a1a1a' : "#FFF0F0" }]}>
                                        <Text style={[styles.chipTxt, styles.chipTxtRegla, { color: "#b83e31" }]}>{typeof r === "object" ? r.nombre : r}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Galeria modal */}
            <Modal visible={galeriaVisible} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" }}>
                    <TouchableOpacity
                        onPress={() => setGaleriaVisible(false)}
                        style={{ position: "absolute", top: insets.top + 16, right: 16, zIndex: 10 }}
                    >
                        <MaterialCommunityIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center",
                        position: "absolute", top: insets.top + 20, alignSelf: "center", fontSize: 13 }}>
                        {mediaActual + 1} / {media.length}
                    </Text>
                    <ScrollView
                        ref={galeriaScrollRef}
                        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH)
                            setMediaActual(idx)
                        }}
                    >
                        {media.map((item: any, i: number) => (
                            <View key={i} style={{ width: SCREEN_WIDTH, justifyContent: "center", alignItems: "center" }}>
                                {item.tipo === "imagen" ? (
                                    <Image source={getMediaUri(item.src)} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6, resizeMode: "contain" }} />
                                ) : (
                                    <GaleriaVideoItem src={item.src} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                        style={{ position: "absolute", bottom: insets.bottom + 20 }}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    >
                        {media.map((item: any, i: number) => (
                            <TouchableOpacity key={i} onPress={() => setMediaActual(i)}>
                                {item.tipo === "imagen" ? (
                                    <Image source={getMediaUri(item.src)} style={{
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
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <View style={[styles.modalIcono, { backgroundColor: colors.error || "#A32D2D" }]}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#ffffff" />
                        </View>
                        <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>¿Cancelar contrato?</Text>
                        <Text style={[styles.modalSubtitulo, { color: colors.textSecondary }]}>
                            Esta acción cancelará tu contrato activo. El inmueble quedará disponible nuevamente.
                        </Text>
                        <TouchableOpacity
                            style={[styles.modalBtnPeligro, { backgroundColor: colors.error || "#A32D2D" }, cancelando && { opacity: 0.7 }]}
                            onPress={handleCancelarRenta}
                            disabled={cancelando}
                        >
                            {cancelando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalBtnPeligroTxt}>Sí, cancelar contrato</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalBtnVolver}
                            onPress={() => setModalCancelarVisible(false)}
                            disabled={cancelando}
                        >
                            <Text style={[styles.modalBtnVolverTxt, { color: colors.textSecondary }]}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal calificación */}
            <Modal visible={modalCalificacionVisible} transparent animationType="fade">
                <View style={styles.ratingOverlay}>
                    <View style={[styles.ratingCard, { backgroundColor: colors.cardBackground }]}>
                        <TouchableOpacity
                            style={styles.ratingSkipBtn}
                            onPress={() => setModalOmitirVisible(true)}
                        >
                            <Text style={[styles.ratingSkipBtnText, { color: colors.buttonMain }]}>Omitir</Text>
                        </TouchableOpacity>

                        <Text style={[styles.ratingTitle, { color: colors.textPrimary }]}>¿Cómo calificas tu experiencia?</Text>

                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                    <MaterialCommunityIcons
                                        name={star <= rating ? "star" : "star-outline"}
                                        size={40}
                                        color={star <= rating ? "#f39c12" : "#ccc"}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={[styles.ratingInput, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }]}
                            placeholder="Cuéntanos tu experiencia (opcional)"
                            placeholderTextColor={colors.textSecondary}
                            value={comentario}
                            onChangeText={setComentario}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.ratingSubmitBtn, { backgroundColor: colors.buttonMain }, enviando && { opacity: 0.7 }]}
                            onPress={handleEnviarCalificacion}
                            disabled={enviando}
                        >
                            {enviando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.ratingSubmitBtnText}>Enviar calificación</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal confirmar omitir */}
            <Modal visible={modalOmitirVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="comment-text-outline" size={48} color={colors.buttonMain} style={{ marginBottom: 12 }} />
                        <Text style={[styles.omitirTitulo, { color: colors.textPrimary }]}>¿Seguro que deseas omitir?</Text>
                        <Text style={[styles.omitirSubtitulo, { color: colors.textSecondary }]}>
                            Tu opinión puede ayudar a más usuarios
                        </Text>
                        <TouchableOpacity
                            style={[styles.omitirBtnContinuar, { backgroundColor: colors.buttonMain }]}
                            onPress={() => {
                                setModalCalificacionVisible(false)
                                setModalOmitirVisible(false)
                                queryClient.invalidateQueries({ queryKey: ['rentaActual', userId] })
                            }}
                        >
                            <Text style={styles.omitirBtnContinuarText}>Continuar sin reseña</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalBtnVolver}
                            onPress={() => setModalOmitirVisible(false)}
                        >
                            <Text style={[styles.modalBtnVolverTxt, { color: colors.textSecondary }]}>Volver</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

export default HomeScreen

const styles = StyleSheet.create({
    container: { flex: 1 },
    sinRentaContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
    sinRentaTitulo: { fontSize: 22, fontWeight: "800", marginTop: 16, textAlign: "center" },
    sinRentaSub: { fontSize: 15, marginTop: 8, textAlign: "center", marginBottom: 24 },
    btnExplorar: { flexDirection: "row", borderRadius: 24, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", gap: 10 },
    btnExplorarTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
    headerAzul: { height: SCREEN_HEIGHT * 0.35, backgroundColor: "#1A62C6", overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12 },
    headerImagen: { position: "absolute", width: "100%", height: "100%", resizeMode: "cover" },
    headerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0A1E3F", opacity: 0.5 },
    headerContenido: { position: "absolute", bottom: 28, left: 20, right: 20 },
    headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    headerLbl: { fontSize: 16, color: "rgba(255,255,255,0.80)", fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
    badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9 },
    badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
    badgeTxt: { fontSize: 15, color: "#fff", fontWeight: "600" },
    headerTitulo: { fontSize: 25, fontWeight: "800", color: "#fff", marginBottom: 4 },
    headerSub: { fontSize: 15, color: "rgba(255,255,255,0.85)" },
    menuDesplegable: { position: "absolute", top: 44, right: 16, borderRadius: 10, paddingVertical: 6, borderWidth: 0.5, zIndex: 100, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 6 },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14 },
    menuItemTxt: { fontSize: 14, color: "#E63946", fontWeight: "600" },
    body: { marginTop: -15, paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, gap: 14 },
    galeriaRow: { flexDirection: "row", gap: 8 },
    imgMiniatura: { height: 160, width: "100%", borderRadius: 14, resizeMode: "cover" },
    imgSmVideo: { backgroundColor: "#0B1221", justifyContent: "center", alignItems: "center" },
    cardVacio: { paddingHorizontal: 4, paddingVertical: 8, gap: 10 },
    card: { borderRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    cardDouble: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)", flexDirection: "row", alignItems: "flex-start", gap: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    cardLbl: { fontSize: 13, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
    timeline: { gap: 0 },
    tlItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    tlLeft: { alignItems: "center", width: 16, flexShrink: 0, marginTop: 2 },
    tlDot: { width: 10, height: 10, borderRadius: 5 },
    tlDotFin: { backgroundColor: "transparent", borderOfWidth: 2, borderBottomWidth: 2, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2 },
    tlLinea: { width: 2, flex: 1, minHeight: 30 },
    tlContent: { paddingBottom: 14, flex: 1 },
    tlLbl: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
    tlVal: { fontSize: 14, fontWeight: "700", marginTop: 2, textTransform: "capitalize" },
    tlPill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8, alignSelf: "flex-start", marginTop: 6 },
    tlPillTxt: { fontSize: 11, fontWeight: "700" },
    arrenRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    avatar: { width: 38, height: 38, borderRadius: 19 },
    arrenNombre: { fontSize: 14, fontWeight: "700" },
    arrenSub: { fontSize: 11 },
    contactarLbl: { marginBottom: 4 },
    contactarVal: { fontSize: 12, fontWeight: "600" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
    chipTxt: { fontSize: 12, fontWeight: "600" },
    chipRegla: { },
    chipTxtRegla: { },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalCard: { borderRadius: 28, padding: 28, width: "85%", alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    modalIcono: { width: 68, height: 68, borderRadius: 34, justifyContent: "center", alignItems: "center", marginBottom: 4 },
    modalTitulo: { fontSize: 18, fontWeight: "800" },
    modalSubtitulo: { fontSize: 13, textAlign: "center", lineHeight: 20 },
    modalBtnPeligro: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, width: "80%", alignItems: "center", marginTop: 6 },
    modalBtnPeligroTxt: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
    modalBtnVolver: { paddingVertical: 10 },
    modalBtnVolverTxt: { fontSize: 13, fontWeight: "600" },
    ratingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
    ratingCard: { borderRadius: 20, padding: 24, width: "90%", alignItems: "center", gap: 16 },
    ratingSkipBtn: { position: "absolute", top: 16, right: 16 },
    ratingSkipBtnText: { fontSize: 14, fontWeight: "600" },
    ratingTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
    starsRow: { flexDirection: "row", gap: 10 },
    ratingInput: { borderRadius: 12, padding: 14, width: "100%", minHeight: 90, fontSize: 14, borderWidth: 1 },
    ratingSubmitBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: "100%", alignItems: "center" },
    ratingSubmitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    omitirTitulo: { fontSize: 18, fontWeight: "800", textAlign: "center" },
    omitirSubtitulo: { fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 6 },
    omitirBtnContinuar: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, width: "80%", alignItems: "center", marginTop: 6 },
    omitirBtnContinuarText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
})
