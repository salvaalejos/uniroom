import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform } from 'react-native'
import { useState, useEffect, useMemo } from 'react'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { API_BASE_URL as API_URL } from '../config'
import { Inmueble } from '../types/properties'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { obtenerMisInmuebles, eliminarInmuebleApi } from '../services/api'
import { InmuebleCard } from '../components/InmuebleCard'
import { ConfirmModal } from '../components/ConfirmModal'

const DEFAULT_IMAGE = require("../default_images/fachada.jpg");

// ---- Componente Inicial ----

const MisInmuebles = () => {
    const insets = useSafeAreaInsets()
    const navegacion = useNavigation<any>()

    const queryClient = useQueryClient();
    const { colors, isDark } = useTheme()

    const [menuAbierto, setMenuAbierto] = useState<number | null>(null);
    const [confirmarId, setConfirmarId] = useState<number | null>(null);

    const { data: inmuebles = [], isLoading: cargando } = useQuery({
        queryKey: ['misInmuebles'],
        queryFn: async () => {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) throw new Error("No hay userId en storage");
            
            const data = await obtenerMisInmuebles(userId);
            
            return data.map((item: any) => ({
                id_inmueble: item.id_inmueble,
                titulo: item.titulo,
                ubicacion: "Morelia, Michoacán",
                descripcion: item.descripcion || "Sin descripción",
                precio: parseFloat(item.precio_mensual),
                estado: item.estado === "DISPONIBLE" ? "publicado" : "pendiente",
                foto: item.imagenes && item.imagenes.length > 0 
                    ? { uri: `${API_URL}${item.imagenes[0].imagen}` } 
                    : DEFAULT_IMAGE,
                rawData: item
            }));
        }
    });

    const mutationEliminar = useMutation({
        mutationFn: (id: number) => eliminarInmuebleApi(id),
        onSuccess: () => {
            setConfirmarId(null);
            queryClient.invalidateQueries({ queryKey: ['misInmuebles'] });
            Alert.alert("Éxito", "Inmueble eliminado correctamente.");
        },
        onError: (error) => {
            console.error("[MisInmuebles] Error al eliminar:", error);
            Alert.alert("Error", "No se pudo eliminar el inmueble.");
        }
    });

    useEffect(() => {
        const unsubscribe = navegacion.addListener('focus', () => {
            queryClient.invalidateQueries({ queryKey: ['misInmuebles'] });
        });
        return unsubscribe;
    }, [navegacion, queryClient]);

    const eliminarInmueble = (id: number) => {
        setMenuAbierto(null)
        setConfirmarId(id)
    }

    const confirmarEliminar = () => {
        if (confirmarId !== null) {
            mutationEliminar.mutate(confirmarId);
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

                        <InmuebleCard 
                            inmueble={inmueble}
                            rightAction={
                                <TouchableOpacity style={styles.btnMenu} onPress={() => setMenuAbierto(menuAbierto === inmueble.id_inmueble ? null : inmueble.id_inmueble)}>
                                    <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textSecondary}/>
                                </TouchableOpacity>
                            }
                        />

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

            <ConfirmModal 
                visible={confirmarId !== null}
                title="Eliminar inmueble"
                description="¿Estás seguro? Esta acción no se puede deshacer."
                primaryButtonText="Eliminar"
                primaryButtonColor={colors.error}
                onPrimaryPress={confirmarEliminar}
                secondaryButtonText="Cancelar"
                onSecondaryPress={() => setConfirmarId(null)}
                buttonsLayout="row"
            />

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
});
