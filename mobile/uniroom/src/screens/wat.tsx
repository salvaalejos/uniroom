// ─ Importes ─
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"

// ─ Constantes ─

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Foto del anfitrion provisional (misma que InmuebleScreen)
const ANFITRION = require("../default_images/anfi.jpg")
const CASA_IMG = require("../default_images/dreamhouse.jpg")

// Datos de la renta activa del usuario
const RENTA_ACTIVA = {
    titulo: "Departamento Centro Morelia",
    arrendador: "Stevenson",
    precio: 3200,
    tipo: "Departamento",
    descripcion: "Departamento amueblado de 2 habitaciones en el corazón de Morelia. Ideal para estudiantes. Incluye todos los servicios básicos y acceso a áreas comunes.",
    ubicacion: "Centro Histórico, Morelia",
    servicios: ["WiFi incluido", "Agua incluida", "Luz incluida", "Lavadora", "Estacionamiento"],
    reglas: ["No mascotas", "No fumar", "No fiestas", "Máx. 2 personas"],
    contactoArrendador: "55 1234 5678",
    fechaInicio: "1 de abril de 2025",
    fechaFin: "1 de octubre de 2025",
    diasRestantes: 157,
    estado: "Activa",
}

// ─ Tipos ─

type Props = {
    navigation?: any
}

// ─ Sub-componente: Tarjeta de info ─

const InfoCard = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.infoCard}>
        <MaterialCommunityIcons name={icon as any} size={20} color="#205EA6" />
        <View style={styles.infoCardTextos}>
            <Text style={styles.infoCardLabel}>{label}</Text>
            <Text style={styles.infoCardValue}>{value}</Text>
        </View>
    </View>
)

// ─ Componente principal ─

const MiRenta = ({ navigation }: Props) => {

    const insets = useSafeAreaInsets()
    const [mostrarContacto, setMostrarContacto] = useState(false)

    const handleDejarDeRentar = () => {
        Alert.alert(
            "¿Dejar de rentar?",
            "Esta acción cancelará tu contrato de renta activo. ¿Estás seguro?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sí, dejar de rentar",
                    style: "destructive",
                    onPress: () => {
                        // Lógica para cancelar renta aqui kdsjfh
                        Alert.alert("Renta cancelada", "Tu solicitud de cancelación fue enviada.")
                    }
                }
            ]
        )
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitulo}>Mi Renta</Text>
                <View style={styles.badgeActiva}>
                    <View style={styles.badgePunto} />
                    <Text style={styles.badgeTexto}>{RENTA_ACTIVA.estado}</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

                {/* Imagen de la propiedad */}
                <View style={styles.imagenContainer}>
                    <Image source={CASA_IMG} style={styles.imagenPropiedad} />
                    <View style={styles.imagenOverlay}>
                        <Text style={styles.imagenTitulo}>{RENTA_ACTIVA.titulo}</Text>
                        <View style={styles.imagenUbicacion}>
                            <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
                            <Text style={styles.imagenUbicacionTexto}>{RENTA_ACTIVA.ubicacion}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.contenido}>

                    {/* Progreso del contrato */}
                    <View style={styles.seccionCard}>
                        <Text style={styles.seccionTitulo}>Contrato</Text>
                        <View style={styles.contratoDates}>
                            <View style={styles.contratoFecha}>
                                <Text style={styles.contratoFechaLabel}>Inicio</Text>
                                <Text style={styles.contratoFechaValor}>{RENTA_ACTIVA.fechaInicio}</Text>
                            </View>
                            <MaterialCommunityIcons name="arrow-right" size={18} color="#aaa" />
                            <View style={styles.contratoFecha}>
                                <Text style={styles.contratoFechaLabel}>Fin</Text>
                                <Text style={styles.contratoFechaValor}>{RENTA_ACTIVA.fechaFin}</Text>
                            </View>
                        </View>
                        <View style={styles.diasRestantesContainer}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#205EA6" />
                            <Text style={styles.diasRestantesTexto}>
                                <Text style={styles.diasRestantesNumero}>{RENTA_ACTIVA.diasRestantes} días</Text>
                                {" "}restantes de contrato
                            </Text>
                        </View>
                    </View>

                    {/* Precio */}
                    <View style={styles.precioCard}>
                        <View>
                            <Text style={styles.precioLabel}>Renta mensual</Text>
                            <View style={styles.precioRow}>
                                <Text style={styles.precioMonto}>${RENTA_ACTIVA.precio.toLocaleString("es-MX")}</Text>
                                <Text style={styles.precioMes}>/mes</Text>
                            </View>
                        </View>
                        <MaterialCommunityIcons name="cash-multiple" size={40} color="#205EA620" />
                    </View>

                    {/* Info general */}
                    <View style={styles.seccionCard}>
                        <Text style={styles.seccionTitulo}>Detalles de la vivienda</Text>
                        <InfoCard icon="home-city" label="Tipo" value={RENTA_ACTIVA.tipo} />
                        <InfoCard icon="text-box-outline" label="Descripción" value={RENTA_ACTIVA.descripcion} />
                    </View>

                    {/* Servicios */}
                    <View style={styles.seccionCard}>
                        <Text style={styles.seccionTitulo}>Servicios incluidos</Text>
                        <View style={styles.tags}>
                            {RENTA_ACTIVA.servicios.map((s, i) => (
                                <View key={i} style={styles.tag}>
                                    <MaterialCommunityIcons name="check-circle" size={14} color="#205EA6" />
                                    <Text style={styles.tagTexto}>{s}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Reglas */}
                    <View style={styles.seccionCard}>
                        <Text style={styles.seccionTitulo}>Reglas de la vivienda</Text>
                        <View style={styles.tags}>
                            {RENTA_ACTIVA.reglas.map((r, i) => (
                                <View key={i} style={[styles.tag, styles.tagRegla]}>
                                    <MaterialCommunityIcons name="close-circle" size={14} color="#b83e31" />
                                    <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{r}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Arrendador */}
                    <View style={styles.seccionCard}>
                        <Text style={styles.seccionTitulo}>Tu arrendador</Text>
                        <View style={styles.arrendadorRow}>
                            <Image source={ANFITRION} style={styles.arrendadorAvatar} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.arrendadorNombre}>{RENTA_ACTIVA.arrendador}</Text>
                                <Text style={styles.arrendadorSub}>Propietario verificado</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.btnContacto}
                                onPress={() => setMostrarContacto(!mostrarContacto)}
                            >
                                <MaterialCommunityIcons name="phone" size={18} color="#fff" />
                                <Text style={styles.btnContactoTexto}>Contactar</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Numero de contacto (se muestra al presionar) */}
                        {mostrarContacto && (
                            <View style={styles.contactoReveal}>
                                <MaterialCommunityIcons name="phone-outline" size={16} color="#205EA6" />
                                <Text style={styles.contactoNumero}>{RENTA_ACTIVA.contactoArrendador}</Text>
                            </View>
                        )}
                    </View>

                    {/* Boton de dejar de rentar */}
                    <TouchableOpacity style={styles.btnDejarRentar} onPress={handleDejarDeRentar}>
                        <MaterialCommunityIcons name="home-remove-outline" size={20} color="#b83e31" />
                        <Text style={styles.btnDejarRentarTexto}>Dejar de rentar</Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </View>
    )
}

export default MiRenta

// ─ Estilos ─

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    headerTitulo: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    badgeActiva: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#e8f5e9",
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    badgePunto: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#2e7d32",
    },
    badgeTexto: {
        fontSize: 13,
        fontWeight: "700",
        color: "#2e7d32",
    },

    // Imagen
    imagenContainer: {
        position: "relative",
    },
    imagenPropiedad: {
        width: SCREEN_WIDTH,
        height: 200,
        resizeMode: "cover",
    },
    imagenOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(26,26,46,0.55)",
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    imagenTitulo: {
        fontSize: 18,
        fontWeight: "800",
        color: "#fff",
        marginBottom: 4,
    },
    imagenUbicacion: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    imagenUbicacionTexto: {
        fontSize: 13,
        color: "#ffffffcc",
    },

    // Contenido
    contenido: {
        padding: 16,
        gap: 14,
    },

    // Cards de secciones
    seccionCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    seccionTitulo: {
        fontSize: 15,
        fontWeight: "800",
        color: "#1a1a2e",
    },

    // Info Cards
    infoCard: {
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
    },
    infoCardTextos: {
        flex: 1,
    },
    infoCardLabel: {
        fontSize: 12,
        color: "#999",
        marginBottom: 2,
    },
    infoCardValue: {
        fontSize: 14,
        color: "#333",
        lineHeight: 20,
    },

    // Contrato
    contratoDates: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    contratoFecha: {
        flex: 1,
        backgroundColor: "#f5f7fa",
        borderRadius: 10,
        padding: 10,
    },
    contratoFechaLabel: {
        fontSize: 11,
        color: "#999",
        marginBottom: 2,
    },
    contratoFechaValor: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    diasRestantesContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EEF4FF",
        borderRadius: 10,
        padding: 10,
    },
    diasRestantesTexto: {
        fontSize: 13,
        color: "#555",
    },
    diasRestantesNumero: {
        fontWeight: "800",
        color: "#205EA6",
    },

    // Precio
    precioCard: {
        backgroundColor: "#205EA6",
        borderRadius: 16,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    precioLabel: {
        fontSize: 12,
        color: "#ffffff99",
        marginBottom: 4,
    },
    precioRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 4,
    },
    precioMonto: {
        fontSize: 28,
        fontWeight: "900",
        color: "#fff",
    },
    precioMes: {
        fontSize: 14,
        color: "#ffffff99",
        marginBottom: 4,
    },

    // Tags
    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#EEF4FF",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
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

    // Arrendador
    arrendadorRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    arrendadorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    arrendadorNombre: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    arrendadorSub: {
        fontSize: 12,
        color: "#888",
    },
    btnContacto: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#205EA6",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    btnContactoTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 13,
    },
    contactoReveal: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#EEF4FF",
        borderRadius: 10,
        padding: 12,
    },
    contactoNumero: {
        fontSize: 15,
        fontWeight: "700",
        color: "#205EA6",
    },

    // Boton dejar de rentar
    btnDejarRentar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "#FFF0F0",
        borderRadius: 14,
        padding: 16,
        marginTop: 4,
    },
    btnDejarRentarTexto: {
        fontSize: 15,
        fontWeight: "700",
        color: "#b83e31",
    },
})