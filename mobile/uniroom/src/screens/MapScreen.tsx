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
      // Fetch a la API de Said
      const res = await fetch(`${API_BASE_URL}/api/inmuebles/filtrar`).catch(() => null);
      let data = res ? await res.json() : null;
      
      // Fallback a los datos mock de Said si el backend no está corriendo
      if (!data || data.length === 0) {
        data = [
          { 
            id_inmueble: 1, 
            titulo: "Departamento Mock",
            precio_mensual: 3500, 
            direccion_latitud: 19.723, 
            direccion_longitud: -101.185,
            arrendador: { nombre: "Anfitrión", apellidos: "Mock", numero_contacto: "1234567890" },
            descripcion: "Descripción de prueba para el inmueble mock.",
            servicios: [{ nombre: 'WiFi' }, { nombre: 'Agua incluida' }],
            restricciones: [{ nombre: 'No mascotas' }],
            calificaciones: [{ calificacion: 5 }, { calificacion: 4 }],
            imagenes: [{ imagen: "../default_images/dreamhouse.jpg" }]
          }
        ];
      }
      
      const procesados = data.map((item: any) => {
        const total = item.calificaciones?.reduce((acc: number, c: any) => acc + c.calificacion, 0) || 0;
        
        // Unificar estructura de media para InmuebleScreen
        const media = item.imagenes?.map((img: any) => {
            // Si la imagen es una URL externa o local
            const src = typeof img.imagen === 'string' && img.imagen.startsWith('..') 
                ? require("../default_images/dreamhouse.jpg") // Fallback para mocks locales
                : { uri: img.imagen.startsWith('http') ? img.imagen : `${API_BASE_URL}${img.imagen}` };
            
            return { tipo: "imagen", src };
        }) || [];

        return {
          ...item,
          anfitrion: item.arrendador ? `${item.arrendador.nombre} ${item.arrendador.apellidos}` : "Anónimo",
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
    navigation.navigate("InmuebleScreen", { inmueble, token: route?.params?.token });
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#205EA6" />
        <Text style={styles.textoCarga}>Cargando mapa e inmuebles...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Encabezado con Filtros (Rama Said) */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>UniRoom Morelia</Text>
        <TouchableOpacity style={styles.btnFiltro} onPress={() => setModalFiltros(true)}>
          <MaterialCommunityIcons name="tune" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Mapa Principal (Tu Rama HEAD) */}
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
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
            <View style={styles.pin}>
              <Text style={styles.pinText}>
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