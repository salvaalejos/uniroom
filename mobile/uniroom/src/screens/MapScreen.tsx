// MapScreen.tsx
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator } from "react-native";
import { SafeAreaView, StatusBar } from "react-native-safe-area-context";
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
      console.log("[Map] Reposicionando cámara después de filtrar");
      const timer = setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: [TEC_ITM.longitude, TEC_ITM.latitude],
          zoomLevel: 14.5,
          animationDuration: 1000,
          animationMode: 'flyTo',
        });
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mapaListo, inmuebles]);

  const fetchInmuebles = async (filtros?: any) => {
    try {
      const token = await AsyncStorage.getItem('token');

      let url = `${API_BASE_URL}/inmuebles`;
      if (filtros) {
        const params = new URLSearchParams();
        if (filtros.precioMax && filtros.precioMax < 99999) params.append('precioMax', filtros.precioMax.toString());
        if (filtros.distanciaMax) params.append('distanciaMax', filtros.distanciaMax.toString());
        if (filtros.servicios && filtros.servicios.length > 0) params.append('servicios', filtros.servicios.join(','));
        if (filtros.restricciones && filtros.restricciones.length > 0) params.append('restricciones', filtros.restricciones.join(','));
        if (filtros.calificacionMin && filtros.calificacionMin > 0) params.append('calificacionMin', filtros.calificacionMin.toString());
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
      }
      
      console.log("[Map] Fetching inmuebles desde:", url);
      
      const res = await fetch(url, {
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

        let fotoUrl = item.arrendador?.foto;
        if (fotoUrl && !fotoUrl.startsWith('http')) {
            fotoUrl = `${API_BASE_URL}${fotoUrl}`;
        }

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
      if (!filtros) setOriginales(procesados);
    } catch (err) {
      console.error("Error fetching inmuebles:", err);
    } finally {
      setCargando(false);
    }
  };

  const filtrarInmuebles = (datos: any) => {
    setModalFiltros(false);
    fetchInmuebles(datos);
  };

  const abrirDetalle = (inmueble: any) => {
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.cardBackground} />
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitulo, { color: colors.textPrimary }]}>UniRoomie Morelia</Text>
        <TouchableOpacity style={[styles.btnFiltro, { backgroundColor: colors.buttonMain }]} onPress={() => setModalFiltros(true)}>
          <MaterialCommunityIcons name="tune" size={24} color={colors.buttonText || "#fff"} />
        </TouchableOpacity>
      </View>

      <Mapbox.MapView
        style={styles.map}
        styleURL={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"}
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => setMapaListo(true)}
      >
        <Mapbox.Camera ref={cameraRef} />

        <Mapbox.PointAnnotation id="escuela" coordinate={[TEC_ITM.longitude, TEC_ITM.latitude]}>
          <View style={[styles.marcadorEscuela, { backgroundColor: colors.cardBackground, borderColor: colors.error }]}>
            <Text style={styles.emojiEscuela}>🏫</Text>
          </View>
        </Mapbox.PointAnnotation>

        {inmuebles.map((prop) => (
          <Mapbox.PointAnnotation
            key={`prop-${prop.id_inmueble}`}
            id={`prop-${prop.id_inmueble}`}
            coordinate={[Number(prop.direccion_longitud), Number(prop.direccion_latitud)]}
            onSelected={() => abrirDetalle(prop)}
          >
            <View style={[styles.pin, { backgroundColor: colors.buttonMain, borderColor: isDark ? colors.border : '#fff' }]}>
              <Text style={[styles.pinText, { color: colors.buttonText || "#fff" }]}>
                ${Number(prop.precio_mensual).toLocaleString('es-MX')}
              </Text>
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      <FiltrosModal visible={modalFiltros} onClose={() => setModalFiltros(false)} onApply={filtrarInmuebles} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, zIndex: 10 },
  headerTitulo: { fontSize: 20, fontWeight: '800' },
  btnFiltro: { padding: 8, borderRadius: 12 },
  map: { flex: 1, width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  textoCarga: { marginTop: 15, fontSize: 16, fontWeight: '500' },
  pin: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  pinText: { fontWeight: 'bold', fontSize: 13 },
  marcadorEscuela: { padding: 6, borderRadius: 20, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5 },
  emojiEscuela: { fontSize: 22 }
});
