import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native'
import { useState, useEffect, useMemo } from 'react'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { API_BASE_URL as API_URL } from '../config'


// ---- Tipo del Inmueble ----
type Inmueble = {
    id_inmueble: number
    titulo: string
    ubicacion: string
    descripcion: string
    precio: number
    estado: string
    foto: string | any
}

const DEFAULT_IMAGE = require("../default_images/fachada.jpg");

// ---- Componente Inicial ----

const MisInmuebles = () => {
    const insets = useSafeAreaInsets()
    const navegacion = useNavigation<any>()

    const [inmuebles, setInmuebles] = useState<Inmueble[]>([])
    const [cargando, setCargando] = useState(true)
    const [confirmarId, setConfirmarId] = useState<number | null>(null)
    const [menuAbierto, setMenuAbierto] = useState<number | null>(null)
    const { colors, isDark } = useTheme()

    const fetchInmuebles = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            const token = await AsyncStorage.getItem('token');
            console.log("[MisInmuebles] Recuperando inmuebles para userId:", userId);
            
            if (!userId || !token) {
                console.warn("[MisInmuebles] No hay userId o token en storage");
                setCargando(false);
                return;
            }

            const url = `${API_URL}/inmuebles?arrendadorId=${userId}`;
            console.log("[MisInmuebles] Fetching:", url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log("[MisInmuebles] Datos recibidos:", data.length);
            
            // Mapear los datos del backend al formato del componente
            const mappedData: Inmueble[] = data.map((item: any) => ({
                id_inmueble: item.id_inmueble,
                titulo: item.titulo,
                ubicacion: "Morelia, Michoacán", // Texto genérico ya que no hay dirección textual en la DB
                descripcion: item.descripcion || "Sin descripción",
                precio: parseFloat(item.precio_mensual),
                estado: item.estado === "DISPONIBLE" ? "publicado" : "pendiente",
                foto: item.imagenes && item.imagenes.length > 0 
                    ? { uri: `${API_URL}${item.imagenes[0].imagen}` } 
                    : DEFAULT_IMAGE,
                rawData: item // Guardamos todo el objeto para cuando se quiera editar
            }));

            setInmuebles(mappedData);
        } catch (error: any) {
            console.error("[MisInmuebles] Error fatal:", error.message);
            Alert.alert("Error", "No se pudieron cargar tus inmuebles.");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        fetchInmuebles();
        
        // Agregar un listener para recargar cuando se regrese a esta pantalla
        const unsubscribe = navegacion.addListener('focus', () => {
            fetchInmuebles();
        });

        return unsubscribe;
    }, [navegacion]);

    const eliminarInmueble = (id: number) => {
        setMenuAbierto(null)
        setConfirmarId(id)
    }

    const confirmarEliminar = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_URL}/inmuebles/${confirmarId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("No se pudo eliminar el inmueble");

            setInmuebles(prev => prev.filter(i => i.id_inmueble !== confirmarId))
            setConfirmarId(null)
            Alert.alert("Éxito", "Inmueble eliminado correctamente.");
        } catch (error) {
            console.error("[MisInmuebles] Error al eliminar:", error);
            Alert.alert("Error", "No se pudo eliminar el inmueble.");
        }
    }

    // --- Editar vivienda

    const editarInmueble = (inmueble: Inmueble) => {
        setMenuAbierto(null)
        navegacion.navigate("Tu Primer Inmueble", { inmueble: inmueble })
    }

    // --- Crear vivienda

    const nuevoInmueble = () => {
        navegacion.navigate("Tu Primer Inmueble", { inmueble: null })
    }

    if (cargando) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.buttonMain} />
                <Text style={{ marginTop: 10, color: colors.textSecondary }}>Cargando tus propiedades...</Text>
            </View>
        );
    }

    return (
        
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>

                <Text style={[styles.titulo, { color: colors.textPrimary }]}>
                    Mis inmuebles
                </Text>

            </View>

            {/* Lista */}
            <ScrollView key={inmuebles.length} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 170 }}>

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

                    <View key={inmueble.id_inmueble}>

                        <View style={[styles.card, { backgroundColor: colors.cardBackground, shadowColor: isDark ? 'transparent' : '#000' }]}>

                            <Image source={typeof inmueble.foto === 'object' ? inmueble.foto : { uri: inmueble.foto }} style={styles.cardFoto}/>

                            <View style={styles.cardInfo}>

                                <View style={styles.cardInfoTop}>

                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                                            {inmueble.titulo}
                                        </Text>
                                        <View style={styles.cardUbicacionRow}>
                                            <MaterialCommunityIcons name="map-marker" size={13} color={colors.accent}/>
                                            <Text style={[styles.cardUbicacion, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {inmueble.ubicacion}
                                            </Text>
                                        </View>
                                        <Text style={[styles.cardDescripcion, { color: colors.textSecondary }]} numberOfLines={2}>
                                            {inmueble.descripcion}
                                        </Text>
                                    </View>

                                    <TouchableOpacity style={styles.btnMenu} onPress={() => setMenuAbierto(menuAbierto === inmueble.id_inmueble ? null : inmueble.id_inmueble)}>
                                        <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textSecondary}/>
                                    </TouchableOpacity>

                                </View>

                                <View style={styles.cardFooter}>

                                    <Text style={[styles.cardPrecio, { color: colors.buttonMain }]}>
                                        ${inmueble.precio.toLocaleString('es-MX')}
                                        <Text style={[styles.cardMes, { color: colors.textSecondary }]}> / mes</Text>
                                    </Text>
                                    <View style={[styles.badge, inmueble.estado === "publicado" ? [styles.badgePublicado, { backgroundColor: colors.accent, borderColor: colors.accent }] : [styles.badgePendiente, { backgroundColor: isDark ? colors.backgroundSecondary : '#FFFFFF', borderColor: colors.buttonMain }]]}>
                                        <Text style={[styles.badgeTexto, inmueble.estado === "publicado" ? styles.badgeTextoPublicado : [styles.badgeTextoPendiente, { color: colors.buttonMain }]]}>
                                            {inmueble.estado === "publicado" ? "Publicado" : "Pendiente"}
                                        </Text>
                                    </View>

                                </View>

                            </View>

                        </View>

                        {/* Menu desplegable */}
                        {menuAbierto === inmueble.id_inmueble && (

                            <View style={[styles.menuDesplegable, { backgroundColor: colors.cardBackground, shadowColor: isDark ? 'transparent' : '#000', borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>

                                <TouchableOpacity style={styles.menuItem} onPress={() => editarInmueble(inmueble)}>
                                    <MaterialCommunityIcons name="pencil" size={18} color={colors.buttonMain}/>
                                    <Text style={[styles.menuItemTexto, { color: colors.textPrimary }]}>
                                        Editar
                                    </Text>
                                </TouchableOpacity>

                                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

                                <TouchableOpacity style={styles.menuItem} onPress={() => eliminarInmueble(inmueble.id_inmueble)}>
                                    <MaterialCommunityIcons name="trash-can" size={18} color={colors.error}/>
                                    <Text style={[styles.menuItemTexto, { color: colors.error }]}>
                                        Eliminar
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}

            </ScrollView>

            {inmuebles.length > 0 && (
                <TouchableOpacity style={[styles.btnFlotante, { bottom: insets.bottom + 90 }]} onPress={nuevoInmueble}>
                    <MaterialCommunityIcons name="plus" size={26} color="#fff"/>
                </TouchableOpacity>
            )}

            {/* Modal de confirmacion */}
            {confirmarId !== null && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCaja, { backgroundColor: colors.cardBackground }]}>
                        <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>Eliminar inmueble</Text>
                        <Text style={[styles.modalTexto, { color: colors.textSecondary }]}>¿Estás seguro? Esta acción no se puede deshacer.</Text>
                        <View style={styles.modalBotones}>
                            <TouchableOpacity style={[styles.modalBtnCancelar, { borderColor: colors.border }]} onPress={() => setConfirmarId(null)}>
                                <Text style={[styles.modalBtnCancelarTexto, { color: colors.textSecondary }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtnEliminar, { backgroundColor: colors.error }]} onPress={confirmarEliminar}>
                                <Text style={[styles.modalBtnEliminarTexto, { color: colors.buttonText }]}>Eliminar</Text>
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
    btnFlotante: {
        position: "absolute",
        right: 20,
        backgroundColor: "#205EA6",
        borderRadius: 30,
        width: 56,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        elevation: 6,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    header: {
        marginTop: 1,
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
        fontSize: 25,
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
