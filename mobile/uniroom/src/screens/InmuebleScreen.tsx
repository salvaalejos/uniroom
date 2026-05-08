// ─ Importes ─
import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Modal } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState, useRef, useEffect } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"
import { useNavigation } from "@react-navigation/native"
import { useTheme } from "../context/ThemeContext"
import AgendarCita from "./AgendarCita"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_BASE_URL } from "../config"

// ─ Constantes ─
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window')

// Foto del anfitrion provisional
const ANFITRION = require("../default_images/anfi.jpg")

const getMediaUri = (src: string): { uri: string } | number => {
    if (!src) return 0;
    if (src.startsWith("http")) return { uri: src };
    return { uri: `${API_BASE_URL}${src}` };
};

// ─ Componente ─
const InmuebleScreen = ({ visible: propVisible, onClose: propOnClose, inmueble: propInmueble, token: propToken, route }: any) => {

    const navigation = useNavigation<any>()
    const { colors, isDark } = useTheme()

    // Obtener parámetros de navegación o de props
    const inmueble = route?.params?.inmueble || propInmueble
    const token = route?.params?.token || propToken
    const visible = route?.params ? true : propVisible
    const onClose = route?.params ? () => navigation.goBack() : propOnClose

    const insets = useSafeAreaInsets()
    const scrollRef = useRef<ScrollView>(null)

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
            try {
                const resp = await fetch(`${API_BASE_URL}/inmuebles/${inmueble.id_inmueble}`, {
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

    const esVideo = inmueble?.media?.[imagenActual]?.tipo === "video"
    const videoSource = esVideo ? inmueble?.media?.[imagenActual]?.src : null

    const player = useVideoPlayer(videoSource, player => {
        if (player && videoSource && visible) {
            player.loop = true
        }
    })

    useEffect(() => {
        if (!visible && player) {
            try {
                player.pause()
            } catch (e) {
                // Ignorar error al limpiar
            }
        }
    }, [visible, player])

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

    if (!inmueble) return null

    const calificaciones = inmueble.calificaciones || []
    const ratingPromedio = calificaciones.length > 0
        ? (calificaciones.reduce((sum, c) => sum + c.calificacion, 0) / calificaciones.length)
        : 0
    const totalOpiniones = calificaciones.length
    const reseñasConComentario = calificaciones.filter(c => c.descripcion && c.descripcion.trim().length > 0)

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Botones estáticos superiores */}
            <TouchableOpacity
                style={[styles.btnCerrar, { top: insets.top + 16, backgroundColor: colors.background }]}
                onPress={onClose}
            >
                <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary}/>
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
                    <View style={[styles.miniaturas, { backgroundColor: colors.backgroundSecondary }]}>
                        {inmueble.media.map((item: any, i: number) => (
                            <TouchableOpacity key={i} onPress={() => {
                                setImagenActual(i)
                                scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true })
                            }}>
                                {item.tipo === "imagen" ? (
                                    <Image source={item.src} style={[styles.miniatura, imagenActual === i && [styles.miniaturaActiva, { borderColor: colors.buttonMain }]]}/>
                                ) : (
                                    <View style={[styles.miniatura, styles.miniaturaVideo, imagenActual === i && [styles.miniaturaActiva, { borderColor: colors.buttonMain }]]}>
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
                    <Text style={[styles.titulo, { color: colors.textPrimary }]}>{inmueble.titulo}</Text>

                    {totalOpiniones > 0 ? (
                        <View style={styles.calificacionContainer}>
                            <View style={styles.calificacionItem}>
                                <Text style={[styles.calificacionNumero, { color: colors.textPrimary }]}>{ratingPromedio.toFixed(1)}</Text>
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
                                <Text style={[styles.calificacionNumero, { color: colors.textPrimary }]}>{totalOpiniones}</Text>
                                <Text style={[styles.opinionesLabel, { color: colors.textSecondary }]}>opiniones</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.sinReseñas}>
                            <MaterialCommunityIcons name="star-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.sinReseñasTxt, { color: colors.textSecondary }]}>Aún no hay reseñas</Text>
                        </View>
                    )}

                    <View style={[styles.divider, { backgroundColor: colors.border }]}/>

                    {/* Anfitrion */}
                    <View style={styles.anfitrionRow}>
                        <Image source={inmueble.fotoAnfitrion || ANFITRION} style={styles.avatarImagen}/>
                        <View>
                            <Text style={[styles.anfitrionLabel, { color: colors.textSecondary }]}>Anfitrión</Text>
                            <Text style={[styles.anfitrionNombre, { color: colors.textPrimary }]}>{inmueble.anfitrion}</Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]}/>

                    {/* Ubicacion */}
                    <View style={styles.seccion}>
                        <MaterialCommunityIcons name="map-marker" size={18} color={colors.buttonMain} />
                        <Text style={[styles.seccionTexto, { color: colors.textPrimary }]}>{inmueble.ubicacion}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]}/>

                    {/* Descripción */}
                    <Text style={[styles.descripcion, { color: colors.textSecondary }]}>{inmueble.descripcion}</Text>

                    <View style={[styles.divider, { backgroundColor: colors.border }]}/>

                    {/* Servicios */}
                    <Text style={[styles.subtitulo, { color: colors.textPrimary }]}>Servicios incluidos</Text>
                    <View style={styles.tags}>
                        {inmueble.servicios?.map((s: any, i: number) => (
                            <View key={i} style={[styles.tag, { backgroundColor: isDark ? colors.backgroundSecondary : "#EEF4FF" }]}>
                                <Text style={[styles.tagTexto, { color: colors.buttonMain }]}>{typeof s === 'object' ? s.nombre : s}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]}/>

                    {/* Reglas */}
                    <Text style={[styles.subtitulo, { color: colors.textPrimary }]}>Reglas de la casa</Text>
                    <View style={styles.tags}>
                        {inmueble.restricciones?.map((r: any, i: number) => (
                            <View key={i} style={[styles.tag, styles.tagRegla, { backgroundColor: isDark ? '#3a1a1a' : "#FFF0F0" }]}>
                                <Text style={[styles.tagTexto, styles.tagTextoRegla, { color: "#b83e31" }]}>{typeof r === 'object' ? r.nombre : r}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]}/>

                    {/* Reseñas de usuarios */}
                    <View style={[styles.comentarioEncabezado, { backgroundColor: isDark ? colors.backgroundSecondary : "#f0f5fc", borderLeftColor: colors.buttonMain }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MaterialCommunityIcons name="star" size={18} color="#f39c12" />
                            <View>
                                <Text style={[styles.comentarioEncabezadoTexto, { color: isDark ? colors.textPrimary : "#0C447C" }]}>Reseñas del público</Text>
                                <Text style={{ fontSize: 12, color: colors.buttonMain }}>{totalOpiniones} opiniones</Text>
                            </View>
                        </View>
                        {reseñasConComentario.length > 0 && (
                            <TouchableOpacity onPress={() => setVerComentarios(!verComentarios)}>
                                <MaterialCommunityIcons
                                    name={verComentarios ? "chevron-up" : "chevron-down"}
                                    size={24}
                                    color={colors.buttonMain}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {reseñasConComentario.length === 0 ? (
                        <Text style={{ color: colors.textSecondary, textAlign: "center", marginBottom: 20 }}>
                            Aún no hay reseñas para este lugar.
                        </Text>
                    ) : verComentarios ? (
                        reseñasConComentario.map((c: any, i: number) => {
                            const studentName = c.estudiante 
                                ? `${c.estudiante.nombre} ${c.estudiante.apellidos}`.trim() 
                                : "Usuario UniRoom";
                            
                            const studentPhoto = c.estudiante?.foto 
                                ? (c.estudiante.foto.startsWith("http") ? { uri: c.estudiante.foto } : { uri: `${API_BASE_URL}${c.estudiante.foto}` })
                                : null;

                            return (
                                <View key={i} style={styles.comentario}>
                                    {studentPhoto ? (
                                        <Image source={studentPhoto} style={styles.comentarioAvatar}/>
                                    ) : (
                                        <View style={[styles.comentarioAvatar, { backgroundColor: colors.buttonMain, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{studentName.charAt(0)}</Text>
                                        </View>
                                    )}
                                    <View style={{flex: 1}}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <View>
                                                <Text style={[styles.comentarioAutor, { color: colors.textPrimary }]}>{studentName}</Text>
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
                                        <Text style={[styles.comentarioTexto, { color: colors.textSecondary }]}>{c.descripcion}</Text>
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={{ color: colors.textSecondary, textAlign: "center", marginBottom: 20, fontSize: 13 }}>
                            Toca la flecha para ver las reseñas.
                        </Text>
                    )}

                </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                <View>
                    <Text style={[styles.footerPrecio, { color: colors.textPrimary }]}>${(Number(inmueble.precio_mensual) || Number(inmueble.precio) || 0).toLocaleString('es-MX')}</Text>
                    <Text style={[styles.footerMes, { color: colors.textSecondary }]}>/ mes</Text>
                </View>

                {yaEstáRentando ? (
                    <View style={[styles.btnRentarDisabled, { backgroundColor: isDark ? colors.backgroundSecondary : "#EEF4FF" }]}>
                        <MaterialCommunityIcons name="lock" size={18} color="#a0b9e9"/>
                        <Text style={[styles.btnRentarDisabledTexto, { color: "#a0b9e9" }]}>Ya tienes una renta activa</Text>
                    </View>
                ) : puedeRentar ? (
                    <TouchableOpacity
                        style={[styles.btnContacto, { backgroundColor: colors.buttonMain }]}
                        onPress={() => setModalRentarVisible(true)}
                    >
                        <MaterialCommunityIcons name="key" size={18} color="#fff"/>
                        <Text style={styles.btnContactoTexto}>Rentar</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.btnContacto, { backgroundColor: colors.buttonMain }]}
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

                {/* 
                <TouchableOpacity
                    style={[styles.btnContacto, { backgroundColor: colors.buttonMain }]}
                    onPress={() => setModalTarifaVisible(true)}
                >
                    <MaterialCommunityIcons name="phone" size={18} color="#fff"/>
                    <Text style={styles.btnContactoTexto}>Contactar</Text>
                </TouchableOpacity>
                */}
            </View>

            {/* Modal de Confirmar Renta */}
            <Modal visible={modalRentarVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="key-variant" size={48} color={colors.buttonMain} style={{ marginBottom: 16 }} />
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Confirmar Renta</Text>
                        <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                            Estás a punto de rentar {inmueble?.titulo} por ${(Number(inmueble?.precio_mensual) || 0).toLocaleString('es-MX')} MXN al mes. ¿Deseas proceder al pago?
                        </Text>
                        <TouchableOpacity
                            style={[styles.btnPagar, { backgroundColor: colors.buttonMain }]}
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
                            <Text style={[styles.btnCancelarTexto, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de Tarifa de Servicio */}
            <Modal visible={modalTarifaVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="shield-check" size={48} color={colors.buttonMain} style={{ marginBottom: 16 }} />
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Tarifa de Contacto</Text>
                        <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                            Para proteger a nuestra comunidad y garantizar un servicio de calidad, cobramos una pequeña tarifa de $50 MXN para contactar a este arrendador.
                        </Text>
                        <TouchableOpacity
                            style={[styles.btnPagar, { backgroundColor: colors.buttonMain }]}
                            onPress={() => {
                                setModalTarifaVisible(false)
                                navigation.navigate("PaymentScreen", { token: token })
                            }}
                        >
                            <Text style={styles.btnPagarTexto}>Entendido, proceder al pago</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalTarifaVisible(false)}>
                            <Text style={[styles.btnCancelarTexto, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

export default InmuebleScreen

const styles = StyleSheet.create({
    container: { flex: 1 },
    galeriaContainer: { position: "relative" },
    imagenPrincipal: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.38, resizeMode: "cover" },
    btnCerrar: { position: "absolute", left: 16, borderRadius: 20, padding: 6, elevation: 5, zIndex: 10, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4 },
    miniaturas: { flexDirection: "row", gap: 8, padding: 12 },
    miniatura: { width: 60, height: 50, borderRadius: 8, opacity: 0.6 },
    miniaturaVideo: { backgroundColor: "#1a1a2e", justifyContent: "center", alignItems: "center" },
    miniaturaActiva: { opacity: 1, borderWidth: 2, borderRadius: 8 },
    info: { padding: 20 },
    titulo: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
    calificacionContainer: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 8 },
    calificacionItem: { alignItems: "center", gap: 4 },
    calificacionNumero: { fontSize: 26, fontWeight: "800" },
    estrellas: { flexDirection: "row", gap: 2 },
    opinionesLabel: { fontSize: 14 },
    sinReseñas: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", paddingVertical: 8 },
    sinReseñasTxt: { fontSize: 14 },
    divider: { height: 1, marginVertical: 16 },
    anfitrionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatarImagen: { width: 48, height: 48, borderRadius: 24 },
    anfitrionLabel: { fontSize: 12 },
    anfitrionNombre: { fontSize: 16, fontWeight: "700" },
    seccion: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    seccionTexto: { flex: 1, fontSize: 14, lineHeight: 20 },
    descripcion: { fontSize: 14, lineHeight: 22 },
    subtitulo: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
    tagTexto: { fontSize: 13, fontWeight: "600" },
    tagRegla: { },
    tagTextoRegla: { },
    comentarioEncabezado: { borderLeftWidth: 2, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    comentarioEncabezadoTexto: { fontSize: 15, fontWeight: "600" },
    comentario: { flexDirection: "row", gap: 10, marginBottom: 20, alignItems: "flex-start" },
    comentarioAvatar: { width: 36, height: 36, borderRadius: 18 },
    comentarioAutor: { fontSize: 15, fontWeight: "700" },
    comentarioTexto: { fontSize: 14, marginTop: 2 },
    footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1 },
    footerPrecio: { fontSize: 20, fontWeight: "800" },
    footerMes: { fontSize: 12 },
    btnContacto: { flexDirection: "row", borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24, alignItems: "center", gap: 8 },
    btnContactoTexto: { color: "#fff", fontWeight: "700", fontSize: 15 },
    btnRentarDisabled: { flexDirection: "row", borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", gap: 8 },
    btnRentarDisabledTexto: { fontWeight: "600", fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalCard: { borderRadius: 24, padding: 32, alignItems: "center", width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
    modalText: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
    btnPagar: { width: "100%", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
    btnPagarTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    btnCancelar: { padding: 12 },
    btnCancelarTexto: { fontWeight: "600", fontSize: 15 }
})
