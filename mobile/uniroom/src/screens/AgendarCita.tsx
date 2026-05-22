import React, { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Alert, ActivityIndicator } from "react-native"
import { Calendar } from "react-native-calendars"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "../context/ThemeContext"
import { API_BASE_URL as API_URL } from "../config"
import Constants from 'expo-constants'

// ─ Utilidades de formato ─
const formatFechaLarga = (f: string) =>
    new Date(f + "T12:00:00").toLocaleDateString("es-MX", {
        weekday: "long", day: "numeric", month: "long"
    })

const formatFechaCorta = (f: string) =>
    new Date(f + "T12:00:00").toLocaleDateString("es-MX", {
        day: "numeric", month: "short"
    })

const formatHora = (h: string) => {
    const [hh, mm] = h.split(":").map(Number)
    const periodo = hh < 12 ? "AM" : "PM"
    const h12 = hh % 12 === 0 ? 12 : hh % 12
    return `${h12}:${mm.toString().padStart(2, "0")} ${periodo}`
}

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ─ Componente ─

const AgendarCita = ({ navigation, route }: any): React.ReactElement => {

    const insets = useSafeAreaInsets()
    const { colors, isDark } = useTheme()
    const { inmueble, token } = route.params || {}
    const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)
    const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
    const [disponibilidad, setDisponibilidad] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [showExito, setShowExito] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)



    // Cargar disponibilidad real del inmueble
    useEffect(() => {
        const fetchDisponibilidad = async () => {
            if (!inmueble?.id_inmueble) return;
            setLoading(true);
            try {
                const resp = await fetch(`${API_URL}/inmuebles/${inmueble.id_inmueble}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                if (data.disponibilidad) {
                    const dispMap: Record<string, string[]> = {};
                    data.disponibilidad.forEach((d: any) => {
                        dispMap[d.fecha] = d.horas;
                    });
                    setDisponibilidad(dispMap);
                }
            } catch (error) {
                console.error("Error al cargar disponibilidad:", error);
                Alert.alert("Error", "No se pudo cargar la disponibilidad del inmueble.");
            } finally {
                setLoading(false);
            }
        };
        fetchDisponibilidad();
    }, [inmueble]);

    const handleConfirmarCita = async () => {
        if (!fechaSeleccionada || !horaSeleccionada) return;
        
        setEnviando(true);
        try {
            const fechaHora = `${fechaSeleccionada}T${horaSeleccionada}:00`;
            const resp = await fetch(`${API_URL}/citas/solicitar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_inmueble: inmueble.id_inmueble,
                    fecha_hora: fechaHora
                })
            });

            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || "Error al agendar la cita");

            setModalVisible(false);
            setShowExito(true);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setEnviando(false);
        }
    }

    const fechasDisponibles = React.useMemo(() => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const diaNombre = DIAS_SEMANA[d.getDay()];
            const YYYYMMDD = d.toISOString().split('T')[0];
            
            if (disponibilidad[diaNombre] || disponibilidad[YYYYMMDD]) {
                const horas = disponibilidad[diaNombre] || disponibilidad[YYYYMMDD];
                dates.push({
                    dateString: YYYYMMDD,
                    diaNombre,
                    horas,
                    diaMes: d.getDate(),
                    mesAbrev: d.toLocaleDateString("es-MX", { month: "short" })
                });
            }
        }
        return dates;
    }, [disponibilidad]);

    const onDayPress = (dateString: string) => {
        setFechaSeleccionada(dateString)
        setHoraSeleccionada(null)
    }

    const horasDelDia = fechaSeleccionada ? fechasDisponibles.find(f => f.dateString === fechaSeleccionada)?.horas || [] : []
    const listo = !!fechaSeleccionada && !!horaSeleccionada

    const fadeAnim = useRef(new Animated.Value(1)).current

    const cerrarConFade = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => navigation.goBack())
    }

    return (
        <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim, backgroundColor: colors.background }]}>

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={[styles.btnBack, { backgroundColor: isDark ? colors.backgroundSecondary : "#EEF4FF" }]} onPress={cerrarConFade}>
                    <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitulo, { color: colors.textPrimary }]}>Agendar visita</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>

                {/* Hint superior */}
                <View style={styles.hintContainer}>
                    <MaterialCommunityIcons name="calendar-search" size={15} color={colors.buttonMain} />
                    <Text style={[styles.hint, { color: colors.buttonMain }]}>
                        {loading ? "Cargando disponibilidad..." : !fechaSeleccionada
                            ? "Toca un día disponible para visitarlo"
                            : !horaSeleccionada ? "Ahora selecciona una hora" : "¡Todo listo para tu visita!"}
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.buttonMain} style={{ marginTop: 20 }} />
                ) : (
                    <>
                        {/* Días disponibles (Carrusel) */}
                        <View style={styles.seccionDias}>
                            <Text style={[styles.seccionTitulo, { color: colors.textPrimary }]}>Próximos días disponibles</Text>
                            {fechasDisponibles.length === 0 ? (
                                <Text style={[styles.hint, { textAlign: 'center', marginTop: 10 }]}>El arrendador aún no ha configurado horarios de visita.</Text>
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.diasScrollContainer}>
                                    {fechasDisponibles.map(item => {
                                        const activo = item.dateString === fechaSeleccionada;
                                        return (
                                            <TouchableOpacity 
                                                key={item.dateString}
                                                style={[
                                                    styles.diaCard,
                                                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                                    activo && [styles.diaCardActivo, { borderColor: colors.buttonMain }]
                                                ]}
                                                onPress={() => onDayPress(item.dateString)}
                                            >
                                                <Text style={[styles.diaMesTexto, { color: activo ? colors.buttonMain : colors.textPrimary }]}>{item.diaMes}</Text>
                                                <Text style={[styles.diaNombreTexto, { color: colors.textSecondary }]}>{item.diaNombre.substring(0,3)}</Text>
                                                <Text style={[styles.diaMesAbrevTexto, { color: colors.textSecondary }]}>{item.mesAbrev}</Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        {/* Horas */}
                        {fechaSeleccionada && (
                            <View style={styles.seccionHoras}>
                                <Text style={[styles.seccionTitulo, { color: colors.textPrimary }]}>Horarios para el {formatFechaCorta(fechaSeleccionada)}</Text>
                                <View style={styles.horasGrid}>
                                    {horasDelDia.map(hora => {
                                        const activo = hora === horaSeleccionada
                                        return (
                                            <TouchableOpacity
                                                key={hora}
                                                style={[
                                                  styles.horaChip, 
                                                  { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                                  activo && [styles.horaChipActivo, { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }]
                                                ]}
                                                onPress={() => setHoraSeleccionada(hora)}
                                            >
                                                <Text style={[styles.horaTexto, { color: colors.buttonMain }, activo && styles.horaTextoActivo]}>
                                                    {formatHora(hora)}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* Resumen */}
                {listo && (
                    <View style={[styles.resumen, { backgroundColor: colors.buttonMain }]}>
                        <View style={styles.resumenHeader}>
                            <View style={styles.resumenIcon}>
                                <MaterialCommunityIcons name="clock-check" size={24} color="#fff" />
                            </View>
                            <View>
                                <Text style={styles.resumenTitulo}>Tu cita seleccionada</Text>
                                <Text style={styles.resumenInfo}>
                                    {formatFechaLarga(fechaSeleccionada!)} a las {formatHora(horaSeleccionada!)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {listo && (
                    <TouchableOpacity style={[styles.btnConfirmar, { backgroundColor: colors.cardBackground, borderColor: colors.buttonMain }]} onPress={() => setModalVisible(true)}>
                        <MaterialCommunityIcons name="calendar-check" size={18} color={colors.buttonMain} />
                        <Text style={[styles.btnConfirmarTexto, { color: colors.buttonMain }]}>Confirmar visita</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>

            {/* Modal de Confirmación / Pago */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="shield-check" size={48} color={colors.buttonMain} style={{ marginBottom: 16 }} />
                        <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>Confirmar visita</Text>
                        <Text style={[styles.modalSubtitulo, { color: colors.textSecondary }]}>Para contactar al arrendador y agendar, se requiere el pago de una tarifa de servicio de $50 MXN.</Text>
                        
                        <View style={[styles.modalResumen, { backgroundColor: colors.backgroundSecondary }]}>
                             <View style={styles.modalFila}>
                                 <MaterialCommunityIcons name="calendar" size={16} color={colors.buttonMain} />
                                 <Text style={[styles.modalFilaTexto, { color: colors.textPrimary }]}>{fechaSeleccionada ? formatFechaLarga(fechaSeleccionada) : ""}</Text>
                             </View>
                             <View style={styles.modalFila}>
                                 <MaterialCommunityIcons name="clock-outline" size={16} color={colors.buttonMain} />
                                 <Text style={[styles.modalFilaTexto, { color: colors.textPrimary }]}>{horaSeleccionada ? formatHora(horaSeleccionada) : ""}</Text>
                             </View>
                         </View>

                        <TouchableOpacity
                            style={[styles.btnPagar, { backgroundColor: colors.buttonMain }]}
                            onPress={handleConfirmarCita}
                            disabled={enviando}
                        >
                            {enviando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.btnPagarTexto}>Confirmar y proceder</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalVisible(false)} disabled={enviando}>
                            <Text style={[styles.btnCancelarTexto, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de Éxito */}
            <Modal visible={showExito} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="check-circle" size={60} color="#2ecc71" style={{ marginBottom: 16 }} />
                        <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>¡Solicitud enviada!</Text>
                        <Text style={[styles.modalSubtitulo, { color: colors.textSecondary }]}>Tu cita para el {fechaSeleccionada && formatFechaLarga(fechaSeleccionada)} a las {horaSeleccionada && formatHora(horaSeleccionada)} ha sido enviada al arrendador.</Text>
                        <TouchableOpacity style={[styles.btnPagar, { backgroundColor: colors.buttonMain }]} onPress={cerrarConFade}>
                            <Text style={styles.btnPagarTexto}>Regresar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </Animated.View>
    )
}

export default AgendarCita

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    btnBack: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
    headerTitulo: { fontSize: 17, fontWeight: "800" },
    hintContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
    hint: { fontSize: 13, fontWeight: "600" },
    seccionDias: { marginTop: 10, paddingHorizontal: 16 },
    diasScrollContainer: { gap: 12, paddingVertical: 10 },
    diaCard: { width: 70, height: 90, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 8 },
    diaCardActivo: { borderWidth: 2, backgroundColor: "rgba(32, 94, 166, 0.05)" },
    diaMesTexto: { fontSize: 24, fontWeight: "800", marginBottom: 2 },
    diaNombreTexto: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
    diaMesAbrevTexto: { fontSize: 11, fontWeight: "500", marginTop: 2, textTransform: "capitalize" },
    seccionHoras: { padding: 20 },
    seccionTitulo: { fontSize: 15, fontWeight: "700", marginBottom: 16 },
    horasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    horaChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, minWidth: (Constants.statusBarHeight > 0 ? 80 : 100) },
    horaChipActivo: { },
    horaTexto: { fontSize: 14, fontWeight: "700" },
    horaTextoActivo: { color: "#fff" },
    resumen: { marginHorizontal: 20, marginTop: 10, borderRadius: 20, padding: 16 },
    resumenHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
    resumenIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
    resumenTitulo: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginBottom: 2 },
    resumenInfo: { fontSize: 15, color: "#fff", fontWeight: "800" },
    btnConfirmar: { flexDirection: "row", borderRadius: 20, paddingVertical: 14, marginHorizontal: 20, marginTop: 24, alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5 },
    btnConfirmarTexto: { fontWeight: "800", fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalCard: { borderRadius: 24, padding: 32, alignItems: "center", width: "100%", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalTitulo: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
    modalSubtitulo: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
    modalResumen: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 20, gap: 10 },
    modalFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    modalFilaTexto: { fontSize: 14, fontWeight: '700' },
    btnPagar: { width: "100%", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
    btnPagarTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    btnCancelar: { padding: 12 },
    btnCancelarTexto: { fontSize: 15, fontWeight: "600" },
})
