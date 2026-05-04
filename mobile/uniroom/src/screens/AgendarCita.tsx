import React, { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Alert, ActivityIndicator } from "react-native"
import { Calendar } from "react-native-calendars"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Constants from "expo-constants"

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

// ─ Componente ─

const AgendarCita = ({ navigation, route }: any): React.ReactElement => {

    const insets = useSafeAreaInsets()
    const { inmueble, token } = route.params || {}
    const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)
    const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
    const [disponibilidad, setDisponibilidad] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [showExito, setShowExito] = useState(false)
    const [modalVisible, setModalVisible] = useState(false)

    const hostUri = Constants.expoConfig?.hostUri?.split(":").shift();
    const API_URL = hostUri ? `http://${hostUri}:3000` : "http://localhost:3000";

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

    const markedDates: Record<string, any> = {}
    Object.keys(disponibilidad).forEach(fecha => {
        const seleccionado = fecha === fechaSeleccionada
        markedDates[fecha] = {
            selected: seleccionado,
            selectedColor: seleccionado ? "#205EA6" : undefined,
            marked: true,
            dotColor: seleccionado ? "#fff" : "#205EA6",
        }
    })

    const onDayPress = (day: { dateString: string }) => {
        if (!disponibilidad[day.dateString]) return
        setFechaSeleccionada(day.dateString)
        setHoraSeleccionada(null)
    }

    const horasDelDia = fechaSeleccionada ? disponibilidad[fechaSeleccionada] : []
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
        <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.btnBack} onPress={cerrarConFade}>
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#1a1a2e" />
                </TouchableOpacity>
                <Text style={styles.headerTitulo}>Agendar visita</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>

                {/* Hint superior */}
                <View style={styles.hintContainer}>
                    <MaterialCommunityIcons name="calendar-search" size={15} color="#205EA6" />
                    <Text style={styles.hint}>
                        {loading ? "Cargando disponibilidad..." : !fechaSeleccionada
                            ? "Toca un día disponible para visitarlo"
                            : !horaSeleccionada ? "Ahora selecciona una hora" : "¡Todo listo para tu visita!"}
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#205EA6" style={{ marginTop: 20 }} />
                ) : (
                    <>
                        {/* Calendario */}
                        <View style={styles.calendarioWrapper}>
                            <Calendar
                                onDayPress={onDayPress}
                                markedDates={markedDates}
                                minDate={new Date().toISOString().split("T")[0]}
                                theme={{
                                    backgroundColor: '#ffffff',
                                    calendarBackground: '#ffffff',
                                    textSectionTitleColor: '#b6c1cd',
                                    selectedDayBackgroundColor: '#205EA6',
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: '#205EA6',
                                    dayTextColor: '#2d4150',
                                    textDisabledColor: '#d9e1e8',
                                    dotColor: '#205EA6',
                                    arrowColor: '#205EA6',
                                    monthTextColor: '#1a1a2e',
                                    indicatorColor: 'blue',
                                    textDayFontWeight: '600',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: '400',
                                    textDayFontSize: 14,
                                    textMonthFontSize: 16,
                                    textDayHeaderFontSize: 12
                                }}
                            />

                            <View style={styles.leyendaContainer}>
                                <View style={styles.leyendaItem}>
                                    <View style={styles.leyendaDot} />
                                    <Text style={styles.leyendaTexto}>Disponible</Text>
                                </View>
                            </View>
                        </View>

                        {/* Horas */}
                        {fechaSeleccionada && (
                            <View style={styles.seccionHoras}>
                                <Text style={styles.seccionTitulo}>Horarios para el {formatFechaCorta(fechaSeleccionada)}</Text>
                                <View style={styles.horasGrid}>
                                    {horasDelDia.map(hora => {
                                        const activo = hora === horaSeleccionada
                                        return (
                                            <TouchableOpacity
                                                key={hora}
                                                style={[styles.horaChip, activo && styles.horaChipActivo]}
                                                onPress={() => setHoraSeleccionada(hora)}
                                            >
                                                <Text style={[styles.horaTexto, activo && styles.horaTextoActivo]}>
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
                    <View style={styles.resumen}>
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
                    <TouchableOpacity style={styles.btnConfirmar} onPress={() => setModalVisible(true)}>
                        <MaterialCommunityIcons name="calendar-check" size={18} color="#205EA6" />
                        <Text style={styles.btnConfirmarTexto}>Confirmar visita</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>

            {/* Modal de Confirmación / Pago */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <MaterialCommunityIcons name="shield-check" size={48} color="#205EA6" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitulo}>Confirmar visita</Text>
                        <Text style={styles.modalSubtitulo}>Para contactar al arrendador y agendar, se requiere el pago de una tarifa de servicio de $50 MXN.</Text>
                        
                        <View style={styles.modalResumen}>
                             <View style={styles.modalFila}>
                                 <MaterialCommunityIcons name="calendar" size={16} color="#205EA6" />
                                 <Text style={styles.modalFilaTexto}>{fechaSeleccionada ? formatFechaLarga(fechaSeleccionada) : ""}</Text>
                             </View>
                             <View style={styles.modalFila}>
                                 <MaterialCommunityIcons name="clock-outline" size={16} color="#205EA6" />
                                 <Text style={styles.modalFilaTexto}>{horaSeleccionada ? formatHora(horaSeleccionada) : ""}</Text>
                             </View>
                         </View>

                        <TouchableOpacity
                            style={styles.btnPagar}
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
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal de Éxito */}
            <Modal visible={showExito} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <MaterialCommunityIcons name="check-circle" size={60} color="#2ecc71" style={{ marginBottom: 16 }} />
                        <Text style={styles.modalTitulo}>¡Solicitud enviada!</Text>
                        <Text style={styles.modalSubtitulo}>Tu cita para el {fechaSeleccionada && formatFechaLarga(fechaSeleccionada)} a las {horaSeleccionada && formatHora(horaSeleccionada)} ha sido enviada al arrendador.</Text>
                        <TouchableOpacity style={styles.btnPagar} onPress={cerrarConFade}>
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
    container: { flex: 1, backgroundColor: "#f7f9ff" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eef2ff" },
    btnBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center" },
    headerTitulo: { fontSize: 17, fontWeight: "800", color: "#1a1a2e" },
    hintContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
    hint: { fontSize: 13, color: "#205EA6", fontWeight: "600" },
    calendarioWrapper: { marginHorizontal: 12, backgroundColor: "#fff", borderRadius: 20, padding: 8, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
    leyendaContainer: { flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 12, marginBottom: 4 },
    leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    leyendaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#205EA6" },
    leyendaTexto: { fontSize: 11, color: "#888", fontWeight: "600" },
    seccionHoras: { padding: 20 },
    seccionTitulo: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 16 },
    horasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    horaChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eef2ff", minWidth: (Constants.statusBarHeight > 0 ? 80 : 100) },
    horaChipActivo: { backgroundColor: "#205EA6", borderColor: "#205EA6" },
    horaTexto: { fontSize: 14, fontWeight: "700", color: "#205EA6" },
    horaTextoActivo: { color: "#fff" },
    resumen: { marginHorizontal: 20, marginTop: 10, backgroundColor: "#205EA6", borderRadius: 20, padding: 16 },
    resumenHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
    resumenIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
    resumenTitulo: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginBottom: 2 },
    resumenInfo: { fontSize: 15, color: "#fff", fontWeight: "800" },
    btnConfirmar: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 20, paddingVertical: 14, marginHorizontal: 20, marginTop: 24, alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: "#205EA6" },
    btnConfirmarTexto: { color: "#205EA6", fontWeight: "800", fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalCard: { backgroundColor: "#fff", borderRadius: 24, padding: 32, alignItems: "center", width: "100%", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalTitulo: { fontSize: 20, fontWeight: "800", color: "#1a1a2e", marginBottom: 8 },
    modalSubtitulo: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 20 },
    modalResumen: { width: '100%', backgroundColor: '#f7f9ff', borderRadius: 16, padding: 16, marginBottom: 20, gap: 10 },
    modalFila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    modalFilaTexto: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
    btnPagar: { backgroundColor: "#205EA6", width: "100%", padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 12 },
    btnPagarTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    btnCancelar: { padding: 12 },
    btnCancelarTexto: { color: "#888", fontWeight: "600", fontSize: 15 },
})
