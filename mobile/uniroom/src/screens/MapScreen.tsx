// MapScreen.tsx
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, SafeAreaView } from "react-native";
import { useState, useEffect, useRef } from "react";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

// Componentes extra
import InmuebleScreen from "./InmuebleScreen";
import FiltrosModal from "./FiltrosModal";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_TOKEN);
}

import Constants from 'expo-constants';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from '../context/ThemeContext';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

const { width, height } = Dimensions.get('window');

// Ubicación del Tec de Morelia
const TEC_ITM = {
  latitude: 19.721869,
  longitude: -101.185483,
};

// Fórmula de Haversine (De la rama de Said)
const getDistancia = (lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - TEC_ITM.latitude) * Math.PI / 180;
  const dLon = (lon2 - TEC_ITM.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(TEC_ITM.latitude * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
};

export default function MapScreen({ route, navigation }: any) {
  // Estados combinados
  const [inmuebles, setInmuebles] = useState<any[]>([]);
  const [originales, setOriginales] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mapaListo, setMapaListo] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    const inicializar = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permiso de ubicación denegado");
      }
      await fetchInmuebles();
    };
    inicializar();
  }, []);

  useEffect(() => {
    if (mapaListo && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [TEC_ITM.longitude, TEC_ITM.latitude],
        zoomLevel: 14.5,
        animationDuration: 1000,
      });
    }
  }, [mapaListo]);

  const fetchInmuebles = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log("[Map] Fetching inmuebles desde:", `${API_BASE_URL}/inmuebles`);
      
      const res = await fetch(`${API_BASE_URL}/inmuebles`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      }).catch(() => null);

      let data = res ? await res.json() : null;
      
      if (!data || data.error || !Array.isArray(data)) {
        console.log("[Map] No se recibieron datos reales, usando fallback...");
        data = [];
      }
      
      const procesados = data.map((item: any) => {
        const total = item.calificaciones?.reduce((acc: number, c: any) => acc + c.calificacion, 0) || 0;
        
        const media = item.imagenes?.map((img: any) => {
            const isVideo = img.imagen.match(/\.(mp4|mov|avi|wmv)$/i);
            return { 
                tipo: isVideo ? "video" : "imagen", 
                src: { uri: img.imagen.startsWith('http') ? img.imagen : `${API_BASE_URL}${img.imagen}` } 
            };
        }) || [];

        // Lógica inteligente para la foto del anfitrión
        let fotoUrl = item.arrendador?.foto;
        if (fotoUrl && !fotoUrl.startsWith('http')) {
            // Si ya trae /public, no lo repetimos (aunque el backend ya lo trae)
            fotoUrl = `${API_BASE_URL}${fotoUrl}`;
        }
        
        console.log(`[Map] Inmueble: ${item.titulo} | Anfitrión: ${item.arrendador?.nombre} | Foto: ${fotoUrl}`);

        return {
          ...item,
          anfitrion: item.arrendador ? `${item.arrendador.nombre} ${item.arrendador.apellidos}` : "Anónimo",
          fotoAnfitrion: fotoUrl ? { uri: fotoUrl } : null,
          contacto: item.arrendador?.numero_contacto || "Sin contacto",
          ubicacion: `Morelia, Mich. (a ${getDistancia(Number(item.direccion_latitud), Number(item.direccion_longitud))} km)`,
          media,
          promedio: item.calificaciones?.length > 0 ? total / item.calificaciones.length : 0,
          calificacion: item.calificaciones?.length > 0 ? (total / item.calificaciones.length).toFixed(1) : "0",
          opiniones: item.calificaciones?.length || 0,
          distancia: parseFloat(getDistancia(Number(item.direccion_latitud), Number(item.direccion_longitud)))
        };
      });

      setInmuebles(procesados);
      setOriginales(procesados);
    } catch (err) {
      console.error("Error fetching inmuebles:", err);
    } finally {
      setCargando(false);
    }
  };

  const filtrarInmuebles = (datos: any) => {
    const { precioMax, distanciaMax, servicios, restricciones, calificacionMin } = datos;
    const filtrados = originales.filter(item => (
      item.precio_mensual <= precioMax &&
      item.distancia <= distanciaMax &&
      item.promedio >= calificacionMin &&
      (servicios.length === 0 || servicios.every((s: string) => item.servicios?.some((is: any) => is.nombre === s))) &&
      (restricciones.length === 0 || restricciones.every((r: string) => item.restricciones?.some((ir: any) => ir.nombre === r)))
    ));
    setInmuebles(filtrados);
    setModalFiltros(false);
  };

  const abrirDetalle = (inmueble: any) => {
    console.log("[Map] Abriendo detalle para:", inmueble.id_inmueble);
    AsyncStorage.getItem('token').then(token => {
        navigation.navigate("InmuebleScreen", { inmueble, token });
    });
  };

  if (cargando) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonMain} />
        <Text style={[styles.textoCarga, { color: colors.textSecondary }]}>Cargando mapa e inmuebles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Encabezado con Filtros (Rama Said) */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitulo, { color: colors.textPrimary }]}>UniRoomie Morelia</Text>
        <TouchableOpacity style={[styles.btnFiltro, { backgroundColor: colors.buttonMain }]} onPress={() => setModalFiltros(true)}>
          <MaterialCommunityIcons name="tune" size={24} color={colors.buttonText} />
        </TouchableOpacity>
      </View>

      {/* Mapa Principal (Tu Rama HEAD) */}
      <Mapbox.MapView
        style={styles.map}
        styleURL={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => setMapaListo(true)}
      >
        <Mapbox.Camera ref={cameraRef} />

        {/* Marcador fijo de la escuela */}
        <Mapbox.PointAnnotation
          id="escuela"
          coordinate={[TEC_ITM.longitude, TEC_ITM.latitude]}
        >
          <View style={styles.marcadorEscuela}>
            <Text style={styles.emojiEscuela}>🏫</Text>
          </View>
        </Mapbox.PointAnnotation>

        {/* Pines generados dinámicamente desde la BD/Filtros */}
        {inmuebles.map((prop) => (
          <Mapbox.PointAnnotation
            key={`prop-${prop.id_inmueble}`}
            id={`prop-${prop.id_inmueble}`}
            coordinate={[Number(prop.direccion_longitud), Number(prop.direccion_latitud)]}
            onSelected={() => abrirDetalle(prop)}
          >
            <View style={[styles.pin, { backgroundColor: colors.buttonMain, borderColor: isDark ? colors.border : '#fff' }]}>
              <Text style={[styles.pinText, { color: colors.buttonText }]}>
                ${Number(prop.precio_mensual).toLocaleString('es-MX')}
              </Text>
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* Modal de Filtros */}
      <FiltrosModal 
        visible={modalFiltros} 
        onClose={() => setModalFiltros(false)} 
        onApply={filtrarInmuebles} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
    zIndex: 10 
  },
  headerTitulo: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  btnFiltro: { backgroundColor: '#205EA6', padding: 8, borderRadius: 12 },
  map: { flex: 1, width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  textoCarga: { marginTop: 15, fontSize: 16, color: '#64748B', fontWeight: '500' },
  pin: { 
    backgroundColor: '#205EA6', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8, 
    borderWidth: 1.5, 
    borderColor: '#fff', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 3, 
    elevation: 5 
  },
  pinText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  marcadorEscuela: { 
    backgroundColor: '#fff', 
    padding: 6, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#E74C3C',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 3, 
    elevation: 5
  },
  emojiEscuela: { fontSize: 22 }
});