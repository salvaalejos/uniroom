import React, { useState, useRef } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated } from "react-native"
import { Calendar } from "react-native-calendars"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// ─ Datos falsos del arrendador edsfedf ─
// Aquí eventualmente vendrá de la API

const DISPONIBILIDAD: Record<string, string[]> = {
    "2026-05-05": ["10:00", "12:00", "16:00"],
    "2026-05-07": ["09:00", "11:00"],
    "2026-05-10": ["10:00", "13:00", "15:00", "17:00"],
    "2026-05-14": ["11:00", "14:00"],
    "2026-05-16": ["09:00", "12:00", "16:00"],
}


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

const AgendarCita = ({ navigation }: any): React.ReactElement => {

    const insets = useSafeAreaInsets()
    const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)
    const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)

    const markedDates: Record<string, any> = {}
    Object.keys(DISPONIBILIDAD).forEach(fecha => {
        const seleccionado = fecha === fechaSeleccionada
        markedDates[fecha] = {
            selected: seleccionado,
            selectedColor: seleccionado ? "#205EA6" : undefined,
            marked: true,
            dotColor: seleccionado ? "#fff" : "#205EA6",
        }
    })

    const onDayPress = (day: { dateString: string }) => {
        // Solo reaccionar si el día tiene disponibilidad
        if (!DISPONIBILIDAD[day.dateString]) return
        setFechaSeleccionada(day.dateString)
        setHoraSeleccionada(null) // reset hora al cambiar día
    }

    const horasDelDia = fechaSeleccionada ? DISPONIBILIDAD[fechaSeleccionada] : []
    const listo = !!fechaSeleccionada && !!horaSeleccionada

    const [modalVisible, setModalVisible] = useState(false)

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
                <TouchableOpacity style={styles.btnBack} onPress={() => {
                    setModalVisible(false)
                    cerrarConFade()
                }}>
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
                        {!fechaSeleccionada
                            ? "Toca un día disponible para visitarlo"
                            : !horaSeleccionada
                            ? "Ahora elige la hora de tu visita"
                            : "¡Todo listo! Confirma tu visita"}
                    </Text>
                </View>

                {/* Calendario */}
                <View style={styles.calendarioWrapper}>
                    <Calendar
                        onDayPress={onDayPress}
                        markingType="dot"
                        markedDates={markedDates}
                        minDate={new Date().toISOString().split("T")[0]}
                        disableAllTouchEventsForDisabledDays
                        theme={{
                            backgroundColor: "transparent",
                            calendarBackground: "transparent",
                            todayTextColor: "#205EA6",
                            todayBackgroundColor: "#EEF4FF",
                            arrowColor: "#205EA6",
                            textDayFontWeight: "600",
                            textMonthFontWeight: "800",
                            textDayHeaderFontWeight: "700",
                            dayTextColor: "#1a1a2e",
                            textDisabledColor: "#ccc",
                            monthTextColor: "#1a1a2e",
                            textMonthFontSize: 16,
                        }}
                    />
                </View>

                {/* Leyenda */}
                <View style={styles.leyendaContainer}>
                    <View style={styles.leyendaItem}>
                        <View style={styles.leyendaDot} />
                        <Text style={styles.leyendaTexto}>Días disponibles</Text>
                    </View>
                    <View style={styles.leyendaItem}>
                        <View style={[styles.leyendaDot, { backgroundColor: "#ccc" }]} />
                        <Text style={styles.leyendaTexto}>No disponible</Text>
                    </View>
                </View>

                {/* Selector de horas */}
                {fechaSeleccionada && (
                    <View style={styles.horasContainer}>

                        <View style={styles.horasHeader}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#205EA6" />
                            <Text style={styles.horasTitulo}>
                                Horarios · {formatFechaLarga(fechaSeleccionada)}
                            </Text>
                        </View>

                        <View style={styles.horasGrid}>
                            {horasDelDia.map(hora => {
                                const activa = hora === horaSeleccionada
                                return (
                                    <TouchableOpacity
                                        key={hora}
                                        style={[styles.horaChip, activa && styles.horaChipActiva]}
                                        onPress={() => setHoraSeleccionada(hora)}
                                    >
                                        <MaterialCommunityIcons
                                            name="clock-time-four-outline"
                                            size={14}
                                            color={activa ? "#fff" : "#205EA6"}
                                        />
                                        <Text style={[styles.horaTexto, activa && styles.horaTextoActiva]}>
                                            {formatHora(hora)}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                    </View>
                )}

                {/* Resumen de la visita */}
                {listo && (
                    <View style={styles.resumenContainer}>
                        <View style={styles.resumenBanner}>

                            <View style={styles.resumenBannerItem}>
                                <MaterialCommunityIcons name="calendar-check" size={20} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.resumenBannerLabel}>Fecha</Text>
                                <Text style={styles.resumenBannerFecha}>{formatFechaCorta(fechaSeleccionada!)}</Text>
                                <Text style={styles.resumenBannerAno}>
                                    {new Date(fechaSeleccionada! + "T12:00:00").getFullYear()}
                                </Text>
                            </View>

                            <View style={styles.resumenBannerDivider} />

                            <View style={styles.resumenBannerItem}>
                                <MaterialCommunityIcons name="clock-check-outline" size={20} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.resumenBannerLabel}>Hora</Text>
                                <Text style={styles.resumenBannerFecha}>{formatHora(horaSeleccionada!)}</Text>
                                <Text style={styles.resumenBannerAno}>hora de visita</Text>
                            </View>

                        </View>

                        <View style={styles.resumenBody}>
                            <Text style={styles.resumenNota}>
                                Asegúrate de ingresar los datos correctamente. Tu solicitud será revisada por el arrendador y te notificaremos una vez que haya sido aprobada.
                            </Text>
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

            {/* Modal de Tarifa */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>

                        {/* Iconos */}
                        <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 16 }}>
                            <MaterialCommunityIcons name="shield-check" size={36} color="#205EA6" />
                        </View>

                        <Text style={styles.modalTitulo}>Confirmar visita</Text>
                        <Text style={styles.modalSubtitulo}>Revisa los detalles antes de proceder</Text>

                        {/* Resumen de fecha y hora */}
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

                        {/* Tarifa */}
                        <View style={{ backgroundColor: "#f0f5fc", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, color: "#185FA5", lineHeight: 20 }}>
                                Para garantizar un servicio de calidad, se cobra una tarifa de{" "}
                                <Text style={{ fontWeight: "700" }}>$50 MXN</Text>{" "}
                                para contactar a este arrendador.
                            </Text>
                        </View>

                        {/* Botones */}
                        <TouchableOpacity
                            style={styles.btnPagar}
                            onPress={() => {
                                setModalVisible(false)
                                navigation.navigate("PaymentScreen", { token: token })
                            }}
                        >
                            <Text style={styles.btnPagarTexto}>Entendido, proceder al pago</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalVisible(false)}>
                            <Text style={styles.btnCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>

        </Animated.View>

    )
}

export default AgendarCita

// ─ Estilos ─

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f7f9ff",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eef2ff",
    },
    btnBack: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EEF4FF",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitulo: {
        fontSize: 17,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    hintContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
    },
    hint: {
        fontSize: 13,
        color: "#205EA6",
        fontWeight: "600",
    },
    calendarioWrapper: {
        marginHorizontal: 12,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 8,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    leyendaContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
        marginTop: 12,
        marginBottom: 4,
    },
    leyendaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    leyendaDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#205EA6",
    },
    leyendaTexto: {
        fontSize: 12,
        color: "#666",
    },
    horasContainer: {
        margin: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    horasHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    horasTitulo: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1a1a2e",
        textTransform: "capitalize",
        flex: 1,
    },
    horasGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    horaChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#205EA6",
        backgroundColor: "#EEF4FF",
    },
    horaChipActiva: {
        backgroundColor: "#205EA6",
        borderColor: "#205EA6",
    },
    horaTexto: {
        fontSize: 14,
        fontWeight: "700",
        color: "#205EA6",
    },
    horaTextoActiva: {
        color: "#fff",
    },
    resumenContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    resumenBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: "#205EA6",
    },
    resumenBannerItem: {
        alignItems: "center",
        gap: 4,
    },
    resumenBannerDivider: {
        width: 1,
        height: 60,
        backgroundColor: "rgba(255,255,255,0.25)",
    },
    resumenBannerLabel: {
        fontSize: 10,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "700",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    resumenBannerFecha: {
        fontSize: 24,
        fontWeight: "800",
        color: "#fff",
        marginTop: 2,
    },
    resumenBannerAno: {
        fontSize: 12,
        color: "rgba(255,255,255,0.6)",
    },
    resumenBody: {
        backgroundColor: "#fff",
        padding: 16,
    },
    resumenNota: {
        fontSize: 13,
        color: "#666",
        lineHeight: 20,
        textAlign: "center",
    },
    btnConfirmar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: "#205EA6",
        width: 200,
        alignSelf: "center",
    },
    btnConfirmarTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
        right: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 28,
        width: "80%",
        alignItems: "center",
        gap: 12,
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    modalIcono: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#EEF4FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    modalTitulo: {
        fontSize: 22,
        fontWeight: "900",
        color: "#1a1a2e",
    },
    modalSubtitulo: {
        fontSize: 14,
        color: "#666",
        textAlign: "center",
    },
    modalResumen: {
        backgroundColor: "#f7f9ff",
        borderRadius: 14,
        padding: 16,
        width: "100%",
        gap: 10,
        marginVertical: 4,
    },
    modalFila: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    modalFilaTexto: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a2e",
        textTransform: "capitalize",
    },
    btnPagar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: "#205EA6",
        width: 250,
        alignSelf: "center",
    },
    btnPagarTexto: {
        color: "#fff",
        fontWeight: "700",
    },
    btnCancelar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 16,
        borderRadius: 30,
        backgroundColor: "#eb695b",
        width: 120,
        alignSelf: "center",
    },
    btnCancelarTexto: {
        color: "#fff",
        fontWeight: "700",
    },
})