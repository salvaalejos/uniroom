import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from "react-native"
import { useState, useRef } from "react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { useVideoPlayer, VideoView } from "expo-video"

// constante xdjsv lol
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window")

// Fotos de la vivienda y del anfitrion
const ANFITRION = require("../default_images/anfi.jpg")

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
    media: [
        { tipo: "imagen", src: require("../default_images/dreamhouse.jpg") },
        { tipo: "imagen", src: require("../default_images/fachada.jpg") },
        { tipo: "imagen", src: require("../default_images/otracasa.jpeg") },
        { tipo: "video", src: require("../default_images/twt.mp4") },
    ]
}

type Props = {
    navigation?: any
}

// tarjeta de la info
const InfoCard = (
    { icon, label, value }: { icon: string; label: string; value: string }
) => {
    <View style={styles.infoCard}>

    </View>
}

// --- COMPONENTE PRINCIPAL JHSCJC

const HomeScreen = ({ navigation }: Props) => {

    const insets = useSafeAreaInsets()
    const [mostrarContacto, setMostrarContacto] = useState(false)
    const scrollRef = useRef<ScrollView>(null)
    const [imagenActual, setImagenActual] = useState(0)
    const player = useVideoPlayer(
        RENTA_ACTIVA.media[imagenActual].tipo === "video" ? RENTA_ACTIVA.media[imagenActual].src : null
    )

    const handleDejarRenta = () => {
        Alert.alert(
            "¿Dejar de rentar?",
            "Esta acción cancelará tu contrato de renta activo. ¿Estás seguro?",
            [
                { text: "Cancelar", style: "cancel"},
                {
                    text: "Sí, dejar de rentar",
                    style: "destructive",
                    onPress: () => {
                        // logica para cancelar renta aqui kdsjfh
                        Alert.alert("Renta cancelada", "Tu solicitud de cancelación fue enviada.")
                    }
                }
            ]
        )
    }

    return (

        <View style={[styles.container,{paddingTop: insets.top }]}>

            {/* Informacion de la vivienda */}
            {/* Info de la casa:
            de quien es,
            cuanto cuesta,
            descripcion,
            tipo,
            servicios
            restricciones
            dejar de rentar (boton)*/}

            {/* Header */}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>

                {/* Imagenes de la propiedad */}
                <View style={styles.galeriaContainer}>

                    <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width)
                            setImagenActual(index)
                    }}>
                        {RENTA_ACTIVA.media.map((item, i) => (
                            item.tipo === "imagen" ? (
                                <Image key={i} source={item.src} style={styles.imagenPrincipal}/>
                            ) : (
                                <VideoView
                                key={i}
                                player={player}
                                style={styles.imagenPrincipal}
                                allowsFullscreen
                                allowsPictureInPicture/>
                            )
                        ))}

                    </ScrollView>

                        {/* Miniautas */}
                        <View style={styles.miniaturas}>
                            {RENTA_ACTIVA.media.map((item, i) => (
                                <TouchableOpacity key={i} onPress={() => {
                                    setImagenActual(i)
                                    scrollRef.current?.scrollTo({ x: i * Dimensions.get('window').width, animated: true })
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

                {/* contrato */}
                <View style={styles.contenido}>



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


            </ScrollView>

        </View>
    )

}

export default HomeScreen

// Estilos jshsjdhs

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f5f7fa",
    },
    infoCard: {
        flexDirection: "row",
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
    galeriaContainer: {
        position: "relative",
    },
    imagenPrincipal: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.38,
        resizeMode: "cover",
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
    contenido: {
        padding: 16,
        gap: 14,
    },



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


})