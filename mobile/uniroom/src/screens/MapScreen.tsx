import { View, StyleSheet, TouchableOpacity, Text, Dimensions, FlatList, Image, SafeAreaView, ActivityIndicator } from "react-native"
import { useState, useEffect } from "react" 
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import FiltrosModal from "./FiltrosModal"

const TEC_ITM = { latitude: 19.721869, longitude: -101.185483 };

const getDistancia = (lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - TEC_ITM.latitude) * Math.PI / 180;
    const dLon = (lon2 - TEC_ITM.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(TEC_ITM.latitude * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

export default function MapScreen({ route, navigation }: any) {
    const [inmuebles, setInmuebles] = useState<any[]>([]);
    const [originales, setOriginales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalFiltros, setModalFiltros] = useState(false);

    useEffect(() => {
        fetchInmuebles();
    }, []);

    const fetchInmuebles = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/inmuebles/filtrar");
            const data = await res.json();
            
            // Simulación de datos
            const mockData = [
                { 
                    id_inmueble: 1, precio_mensual: 3500, direccion_latitud: 19.723, direccion_longitud: -101.185,
                    servicios: [{ nombre: 'WiFi' }, { nombre: 'Agua incluida' }],
                    restricciones: [{ nombre: 'No mascotas' }],
                    calificaciones: [{ calificacion: 5 }, { calificacion: 4 }],
                    imagenes: [{ src: require("../default_images/dreamhouse.jpg") }]
                }
            ];
            
            const procesados = mockData.map(item => {
                const total = item.calificaciones.reduce((acc, c) => acc + c.calificacion, 0);
                return {
                    ...item,
                    promedio: item.calificaciones.length > 0 ? total / item.calificaciones.length : 0,
                    distancia: parseFloat(getDistancia(Number(item.direccion_latitud), Number(item.direccion_longitud)))
                };
            });

            setInmuebles(procesados);
            setOriginales(procesados);
        } finally {
            setLoading(false);
        }
    };

    const filtrarInmuebles = (datos: any) => {
        const { precioMax, distanciaMax, servicios, restricciones, calificacionMin } = datos;
        const filtrados = originales.filter(item => (
            item.precio_mensual <= precioMax &&
            item.distancia <= distanciaMax &&
            item.promedio >= calificacionMin &&
            (servicios.length === 0 || servicios.every((s: string) => item.servicios.some((is: any) => is.nombre === s))) &&
            (restricciones.length === 0 || restricciones.every((r: string) => item.restricciones.some((ir: any) => ir.nombre === r)))
        ));
        setInmuebles(filtrados);
        setModalFiltros(false);
    };

    const renderCard = ({ item }: any) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("InmuebleScreen", { inmueble: item })}>
            <Image source={item.imagenes[0].src} style={styles.image} />
            <View style={styles.cardInfo}>
                <View style={styles.row}>
                    <Text style={styles.precio}>${item.precio_mensual} MXN</Text>
                    <View style={styles.rating}>
                        <MaterialCommunityIcons name="star" size={14} color="#f39c12" />
                        <Text style={styles.ratingText}>{item.promedio.toFixed(1)}</Text>
                    </View>
                </View>
                <View style={styles.footerCard}>
                    <View style={styles.tag}><Text style={styles.tagText}>{item.distancia} km del Tec</Text></View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#205EA6" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitulo}>UniRoom Morelia</Text>
                <TouchableOpacity style={styles.btnFiltro} onPress={() => setModalFiltros(true)}>
                    <MaterialCommunityIcons name="tune" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
            <FlatList data={inmuebles} keyExtractor={i => i.id_inmueble.toString()} renderItem={renderCard} contentContainerStyle={styles.listContent} />
            <FiltrosModal visible={modalFiltros} onClose={() => setModalFiltros(false)} onApply={filtrarInmuebles} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTitulo: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    btnFiltro: { backgroundColor: '#205EA6', padding: 8, borderRadius: 12 },
    listContent: { padding: 15 },
    card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, overflow: 'hidden', elevation: 3 },
    image: { width: '100%', height: 180 },
    cardInfo: { padding: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    precio: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    rating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    ratingText: { marginLeft: 4, fontSize: 12, fontWeight: '700', color: '#D97706' },
    footerCard: { marginTop: 10 },
    tag: { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    tagText: { fontSize: 12, color: '#205EA6', fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});