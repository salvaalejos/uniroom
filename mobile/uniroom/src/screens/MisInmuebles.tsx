import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import { useState } from 'react'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'


// ---- Tipo del Inmueble ----
type Inmueble = {
    id: number
    titulo: string
    ubicacion: string
    descripcion: string
    precio: number
    estado: "pendiente" | "publicado"
    foto: ReturnType<typeof require>
}

const IMAGENES = {
    casa_uno: require("../default_images/fachada.jpg"),
    casa_dos: require("../default_images/casa2.jpg"),
    casa_tres: require("../default_images/casa3.png")
}

// --- Datos falsos sjhdjshds
const INMUEBLES_INICIALES: Inmueble[] = [
    { 
        id: 1, 
        titulo: "Departamento Centro de Morelia", 
        ubicacion: "Centro Histórico, Morelia", 
        descripcion: "Departamento amueblado de 2 recámaras en el corazón de Morelia, a pasos de la Catedral y el mercado. Cocina equipada, baño completo, agua y luz incluidos. Perfecto para estudiantes o profesionistas.", 
        precio: 3200, 
        estado: "publicado", 
        foto: IMAGENES.casa_uno 
    },
    { 
        id: 2, 
        titulo: "Cuarto amueblado cerca del Tec", 
        ubicacion: "Félix Ireta, Morelia", 
        descripcion: "Cuarto privado totalmente amueblado a 5 minutos del Tecnológico de Morelia. Incluye cama matrimonial, escritorio, closet y WiFi de alta velocidad. Baño compartido con solo un compañero. Ambiente tranquilo y seguro.", 
        precio: 1800, 
        estado: "pendiente", 
        foto: IMAGENES.casa_dos 
    },
    { 
        id: 3, 
        titulo: "Estudio con balcón", 
        ubicacion: "Chapultepec, Morelia", 
        descripcion: "Acogedor estudio con balcón privado y vista a zona arbolada en una de las colonias más tranquilas de Morelia. Área de cocina integrada, baño propio y estacionamiento incluido. Ideal para quien busca tranquilidad sin alejarse de todo.", 
        precio: 2700, 
        estado: "pendiente", 
        foto: IMAGENES.casa_tres 
    },
]

// ---- Componente Inicial ----

const MisInmuebles = () => {
    const insets = useSafeAreaInsets()
    const navegacion = useNavigation<any>()

    const [inmuebles, setInmuebles] = useState<Inmueble[]>([...INMUEBLES_INICIALES])
    const [confirmarId, setConfirmarId] = useState<number | null>(null)
    const [menuAbierto, setMenuAbierto] = useState<number | null>(null)

    // --- Eliminar vivienda 

    // const eliminarInmueble = (id:number) => {
    //     setMenuAbierto(null)
    //     console.log("eliminarInmueble llamado con id:", id)
    //     setTimeout(() => {
    //         Alert.alert(
    //             "Eliminar inmueble",
    //             "¿Estás seguro? Esta acción no se puede deshacer.",
    //             [
    //                 { text: "Cancelar", style: "cancel" },
    //                 { text: "Eliminar", style: "destructive", onPress: () => setInmuebles(prev => prev.filter(i => i.id !== id)) }
    //             ]
    //         )
    //     }, 150)
    // }

    const eliminarInmueble = (id: number) => {
        setMenuAbierto(null)
        setConfirmarId(id)
    }

    const confirmarEliminar = () => {
        setInmuebles(prev => prev.filter(i => i.id !== confirmarId))
        setConfirmarId(null)
    }

    // --- Editar vivienda

    const editarInmueble = (inmueble: Inmueble) => {
        setMenuAbierto(null)
        navegacion.navigate("SubirInmueble", {inmueble: inmueble})
    }

    // --- Crear vivienda

    const nuevoInmueble = () => {
        navegacion.navigate("SubirInmueble", {inmueble: null})
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
        
            {/* Header */}
            <View style={styles.header}>

                <Text style={styles.titulo}>
                    Mis inmuebles
                </Text>

                <TouchableOpacity style={styles.btnNuevo} onPress={nuevoInmueble}>
                    <MaterialCommunityIcons name="plus" size={22} color="#fff"/>
                    <Text style={styles.btnNuevoTexto}>
                        Nuevo
                    </Text>
                </TouchableOpacity>

            </View>

            {/* Lista */}
            <ScrollView key={inmuebles.length} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 90 }}>

                {inmuebles.length === 0 && (

                    <View style={styles.vacio}>

                        <MaterialCommunityIcons name="home-off" size={64} color="#ccc" />
                        <Text style={styles.vacioTexto}>
                            No tienes inmuebles publicados aún
                        </Text>

                        <TouchableOpacity style={styles.btnNuevoVacio} onPress={nuevoInmueble}>
                            <Text style={styles.btnNuevoVacioTexto}>
                                Agregar mi primer inmueble
                            </Text>
                        </TouchableOpacity>

                    </View>

                )}

                {inmuebles.map(inmueble => (

                    <View key={inmueble.id}>

                        <View style={styles.card}>

                            <Image source={inmueble.foto} style={styles.cardFoto}/>

                            <View style={styles.cardInfo}>

                                <View style={styles.cardInfoTop}>

                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitulo} numberOfLines={1}>
                                            {inmueble.titulo}
                                        </Text>
                                        <View style={styles.cardUbicacionRow}>
                                            <MaterialCommunityIcons name="map-marker" size={13} color="#205EA6"/>
                                            <Text style={styles.cardUbicacion} numberOfLines={1}>
                                                {inmueble.ubicacion}
                                            </Text>
                                        </View>
                                        <Text style={styles.cardDescripcion}>
                                            {inmueble.descripcion}
                                        </Text>
                                    </View>

                                    <TouchableOpacity style={styles.btnMenu} onPress={() => setMenuAbierto(menuAbierto === inmueble.id ? null : inmueble.id)}>
                                        <MaterialCommunityIcons name="dots-vertical" size={22} color="#888"/>
                                    </TouchableOpacity>

                                </View>

                                <View style={styles.cardFooter}>

                                    <Text style={styles.cardPrecio}>
                                        ${inmueble.precio.toLocaleString('es-MX')}
                                        <Text style={styles.cardMes}> / mes</Text>
                                    </Text>
                                    <View style={[styles.badge, inmueble.estado === "publicado" ? styles.badgePublicado : styles.badgePendiente]}>
                                        <Text style={[styles.badgeTexto, inmueble.estado === "publicado" ? styles.badgeTextoPublicado : styles.badgeTextoPendiente]}>
                                            {inmueble.estado === "publicado" ? "Publicado" : "Pendiente"}
                                        </Text>
                                    </View>

                                </View>

                            </View>

                        </View>

                        {/* Menu desplegable */}
                        {menuAbierto === inmueble.id && (

                            <View style={styles.menuDesplegable}>

                                <TouchableOpacity style={styles.menuItem} onPress={() => editarInmueble(inmueble)}>
                                    <MaterialCommunityIcons name="pencil" size={18} color="#205EA6"/>
                                    <Text style={styles.menuItemTexto}>
                                        Editar
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.menuDivider} />

                                <TouchableOpacity style={styles.menuItem} onPress={() => eliminarInmueble(inmueble.id)}>
                                    <MaterialCommunityIcons name="trash-can" size={18} color="#e74c3c"/>
                                    <Text style={[styles.menuItemTexto, { color: "#e74c3c" }]}>
                                        Eliminar
                                    </Text>
                                </TouchableOpacity>

                            </View>

                        )}

                    </View>
                ))}

            </ScrollView>

            {/* Modal de confirmacion */}
            {confirmarId !== null && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCaja}>
                        <Text style={styles.modalTitulo}>Eliminar inmueble</Text>
                        <Text style={styles.modalTexto}>¿Estás seguro? Esta acción no se puede deshacer.</Text>
                        <View style={styles.modalBotones}>
                            <TouchableOpacity style={styles.modalBtnCancelar} onPress={() => setConfirmarId(null)}>
                                <Text style={styles.modalBtnCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnEliminar} onPress={confirmarEliminar}>
                                <Text style={styles.modalBtnEliminarTexto}>Eliminar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

        </View>
    )
}

export default MisInmuebles

// ---- Estilos ----

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
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    titulo: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    btnNuevo: {
        flexDirection: "row",
        backgroundColor: "#205EA6",
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: "center",
        gap: 6,
    },
    btnNuevoTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        position: "relative",
    },
    cardFoto: {
        width: "100%",
        height: 160,
        resizeMode: "cover",
    },
    cardInfo: {
        padding: 14,
        gap: 10,
    },
    cardInfoTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    cardTitulo: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    cardUbicacionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 10,
    },
    cardUbicacion: {
        fontSize: 12,
        color: "#888",
        flex: 1,
    },
    cardDescripcion: {
        fontSize: 14,
        color: "#888",
        marginTop: 10,
    },
    btnMenu: {
        padding: 4,
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardPrecio: {
        fontSize: 18,
        fontWeight: "800",
        color: "#205EA6",
    },
    cardMes: {
        fontSize: 12,
        fontWeight: "400",
        color: "#888",
    },
    badge: {
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    badgePublicado: {
        backgroundColor: "#2090a6",
        borderWidth: 1.5,
        borderColor: "#2090a6"
    },
    badgePendiente: {
        backgroundColor: "#ffffff",
        borderWidth: 1.5,
        borderColor: "#205EA6"
    },
    badgeTexto: {
        fontSize: 12,
        fontWeight: "700",
    },
    badgeTextoPublicado: {
        color: "#ffffff",
    },
    badgeTextoPendiente: {
        color: "#205EA6",
    },
    menuDesplegable: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#fff",
        borderRadius: 10,
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 8,
        minWidth: 130,
        zIndex: 10,
        //alignSelf: "flex-end",
        //marginTop: 4,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12,
    },
    menuDivider: {
        height: 1,
        backgroundColor: "#eee",
    },
    menuItemTexto: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a1a2e",
    },
    vacio: {
        alignItems: "center",
        marginTop: 80,
        gap: 12,
    },
    vacioTexto: {
        fontSize: 15,
        color: "#aaa",
        textAlign: "center",
    },
    btnNuevoVacio: {
        backgroundColor: "#205EA6",
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 8,
    },
    btnNuevoVacioTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 14,
    },

    // ------------

    modalOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
    },
    modalCaja: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: "80%",
        gap: 12,
    },
    modalTitulo: {
        fontSize: 17,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    modalTexto: {
        fontSize: 14,
        color: "#666",
    },
    modalBotones: {
        flexDirection: "row",
        gap: 10,
        marginTop: 8,
    },
    modalBtnCancelar: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        alignItems: "center",
    },
    modalBtnCancelarTexto: {
        fontWeight: "600",
        color: "#666",
    },
    modalBtnEliminar: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#e74c3c",
        alignItems: "center",
    },
    modalBtnEliminarTexto: {
        fontWeight: "700",
        color: "#fff",
    },

})