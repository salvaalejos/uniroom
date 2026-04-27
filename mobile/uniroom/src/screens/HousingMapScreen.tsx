import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator,
  Alert, StatusBar, Modal as RNModal, FlatList, Animated
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import PropertyDetailModal from './PropertyDetailModal';
import { PROPIEDADES, type Propiedad } from '../data/propiedades';
import { getNearbyRoutesDetails, type RouteDetail } from '../services/routePlanner';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
Mapbox.setAccessToken(MAPBOX_TOKEN!);

const { width, height } = Dimensions.get('window');
const TEC_ITM = { latitude: 19.721869, longitude: -101.185483 };
const TAB_BAR_HEIGHT = 70;
const BOTTOM_SPACING = TAB_BAR_HEIGHT + 16;

export default function HousingMapScreen() {
  const [modo, setModo] = useState<'buscando' | 'viviendo'>('buscando');
  const [propiedadRentada, setPropiedadRentada] = useState<Propiedad | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [origenRuta, setOrigenRuta] = useState<'ubicacion' | 'casa'>('ubicacion');
  const [plannedRoute, setPlannedRoute] = useState<any>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [propiedadSeleccionada, setPropiedadSeleccionada] = useState<Propiedad | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [centroInicial, setCentroInicial] = useState(false);
  const [showRoutesList, setShowRoutesList] = useState(false);
  const [routesList, setRoutesList] = useState<RouteDetail[]>([]);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const lastTapTime = useRef({ ubicacion: 0, escuela: 0 });

  // Snackbar animations
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const snackbarAnim = useRef(new Animated.Value(0)).current;

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
    Animated.sequence([
      Animated.timing(snackbarAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(snackbarAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSnackbarVisible(false));
  };

  // Obtener ubicación al inicio
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // No alert, solo texto en pantalla
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })();
  }, []);

  // Centrar mapa según modo
  useEffect(() => {
    if (!mapaListo || !cameraRef.current || centroInicial) return;
    if (modo === 'buscando') {
      cameraRef.current.setCamera({
        centerCoordinate: [TEC_ITM.longitude, TEC_ITM.latitude],
        zoomLevel: 15,
        animationDuration: 1000,
      });
      setCentroInicial(true);
    } else if (modo === 'viviendo' && userLocation) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.lng, userLocation.lat],
        zoomLevel: 15,
        animationDuration: 1000,
      });
      setCentroInicial(true);
    } else if (modo === 'viviendo' && propiedadRentada && !userLocation) {
      cameraRef.current.setCamera({
        centerCoordinate: [propiedadRentada.lng, propiedadRentada.lat],
        zoomLevel: 16,
        animationDuration: 1000,
      });
      setCentroInicial(true);
    }
  }, [mapaListo, modo, userLocation, propiedadRentada]);

  // Cargar ruta cuando cambia origen
  const cargarRuta = useCallback(async (origen: { lat: number; lng: number }) => {
    setCargandoRuta(true);
    try {
      const result = await import('../services/routePlanner').then(m => m.planRouteToSchool(origen.lat, origen.lng));
      setPlannedRoute(result);
      const detalles = await import('../services/routePlanner').then(m => m.getNearbyRoutesDetails(origen.lat, origen.lng));
      setRoutesList(detalles);
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoRuta(false);
    }
  }, []);

  useEffect(() => {
    if (modo === 'viviendo') {
      const origen = origenRuta === 'ubicacion' ? userLocation : propiedadRentada;
      if (origen) cargarRuta(origen);
    } else {
      setPlannedRoute(null);
      setRoutesList([]);
    }
  }, [modo, origenRuta, userLocation, propiedadRentada]);

  const alquilarPropiedad = (prop: Propiedad) => {
    if (propiedadRentada?.id === prop.id) return;
    
    if (propiedadRentada) {
      Alert.alert(
        'Cambiar de vivienda',
        `¿Seguro que quieres cambiar tu vivienda actual por ${prop.titulo}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sí, cambiar',
            onPress: () => {
              setPropiedadRentada(prop);
              setModo('viviendo');
              setModalVisible(false);
              setTimeout(() => {
                if (cameraRef.current) {
                  cameraRef.current.setCamera({
                    centerCoordinate: [prop.lng, prop.lat],
                    zoomLevel: 16,
                    animationDuration: 500,
                  });
                }
              }, 100);
              showSnackbar(`Ahora vives en ${prop.titulo}`);
            },
          },
        ]
      );
    } else {
      setPropiedadRentada(prop);
      setModo('viviendo');
      setModalVisible(false);
      setTimeout(() => {
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [prop.lng, prop.lat],
            zoomLevel: 16,
            animationDuration: 500,
          });
        }
      }, 100);
      showSnackbar(`¡Bienvenido a tu nueva vivienda! ${prop.titulo}`);
    }
  };

  // Centrar con doble toque para resetear heading
  const centrarEnMiUbicacion = () => {
    const now = Date.now();
    if (now - lastTapTime.current.ubicacion < 300) {
      cameraRef.current?.setCamera({ heading: 0, animationDuration: 300 });
    } else {
      if (userLocation) {
        cameraRef.current?.setCamera({
          centerCoordinate: [userLocation.lng, userLocation.lat],
          zoomLevel: 16,
          animationDuration: 500,
        });
      }
    }
    lastTapTime.current.ubicacion = now;
  };

  const centrarEnEscuela = () => {
    const now = Date.now();
    if (now - lastTapTime.current.escuela < 300) {
      cameraRef.current?.setCamera({ heading: 0, animationDuration: 300 });
    } else {
      cameraRef.current?.setCamera({
        centerCoordinate: [TEC_ITM.longitude, TEC_ITM.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
    lastTapTime.current.escuela = now;
  };

  const renderPropertyMarker = (prop: Propiedad) => {
    const esMiCasa = propiedadRentada?.id === prop.id;
    if (modo === 'buscando' && esMiCasa) {
      return (
        <Mapbox.PointAnnotation
          key={prop.id}
          id={`prop-${prop.id}`}
          coordinate={[prop.lng, prop.lat]}
          onSelected={() => {
            setPropiedadSeleccionada(prop);
            setModalVisible(true);
          }}
        >
          <View style={styles.marcadorMiCasa}>
            <Ionicons name="home" size={24} color="#FFF" />
          </View>
        </Mapbox.PointAnnotation>
      );
    } else if (modo === 'buscando') {
      return (
        <Mapbox.PointAnnotation
          key={prop.id}
          id={`prop-${prop.id}`}
          coordinate={[prop.lng, prop.lat]}
          onSelected={() => {
            setPropiedadSeleccionada(prop);
            setModalVisible(true);
          }}
        >
          <View style={styles.pinPrecio}>
            <Text style={styles.pinTexto}>${prop.precio.toLocaleString('es-MX')}</Text>
          </View>
        </Mapbox.PointAnnotation>
      );
    }
    return null;
  };

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor="#0F2C4F" />

      <Mapbox.MapView
        style={styles.mapa}
        styleURL="mapbox://styles/mapbox/streets-v12"
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => setMapaListo(true)}
      >
        <Mapbox.Camera ref={cameraRef} />

        {/* Escuela */}
        <Mapbox.PointAnnotation id="escuela" coordinate={[TEC_ITM.longitude, TEC_ITM.latitude]}>
          <View style={styles.marcadorEscuela}>
            <Ionicons name="school" size={30} color="#FFF" />
          </View>
        </Mapbox.PointAnnotation>

        {/* Usuario */}
        {userLocation && (
          <Mapbox.PointAnnotation id="miUbicacion" coordinate={[userLocation.lng, userLocation.lat]}>
            <View style={styles.marcadorUsuario}>
              <View style={styles.pulso} />
              <Ionicons name="person" size={24} color="#FFF" />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Casa rentada (en modo viviendo) */}
        {modo === 'viviendo' && propiedadRentada && (
          <Mapbox.PointAnnotation id="miCasa" coordinate={[propiedadRentada.lng, propiedadRentada.lat]}>
            <View style={styles.marcadorCasaRentada}>
              <Ionicons name="home" size={26} color="#FFF" />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Propiedades en renta */}
        {modo === 'buscando' && PROPIEDADES.map(renderPropertyMarker)}

        {/* Ruta planificada */}
        {plannedRoute && plannedRoute.segments && plannedRoute.segments.map((seg: any, idx: number) => (
          <Mapbox.ShapeSource
            key={idx}
            id={`ruta-${idx}`}
            shape={{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: seg.coords },
              properties: {},
            }}
          >
            <Mapbox.LineLayer
              id={`linea-${idx}`}
              style={{
                lineWidth: 7,
                lineColor: seg.route.color,
                lineOpacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ))}
      </Mapbox.MapView>

      {/* Botones flotantes */}
      <View style={styles.controlButtons}>
        <TouchableOpacity style={styles.controlBtn} onPress={centrarEnMiUbicacion}>
          <Ionicons name="locate" size={26} color="#205EA6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={centrarEnEscuela}>
          <Ionicons name="school" size={26} color="#2B9348" />
        </TouchableOpacity>
      </View>

      {/* Panel inferior según modo */}
      {modo === 'buscando' ? (
        <View style={styles.panelBusqueda}>
          <Text style={styles.tituloPanel}>Encuentra tu nueva vivienda</Text>
          <Text style={styles.subtituloPanel}>Toca cualquier marcador para ver detalles</Text>
          {propiedadRentada && (
            <TouchableOpacity style={styles.botonCambioModo} onPress={() => setModo('viviendo')}>
              <Ionicons name="home" size={18} color="#FFF" />
              <Text style={styles.textoBoton}>Ver mi ruta diaria</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.panelViviendo}>
          <View style={styles.switchContainer}>
            <Text style={styles.labelSwitch}>Ruta desde:</Text>
            <View style={styles.switchWrapper}>
              <TouchableOpacity
                style={[styles.opcionSwitch, origenRuta === 'ubicacion' && styles.opcionActiva]}
                onPress={() => setOrigenRuta('ubicacion')}
              >
                <Ionicons name="person" size={18} color={origenRuta === 'ubicacion' ? '#FFF' : '#6C757D'} />
                <Text style={origenRuta === 'ubicacion' ? styles.textoOpcionActivo : styles.textoOpcion}>Mi ubicación</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.opcionSwitch, origenRuta === 'casa' && styles.opcionActiva]}
                onPress={() => setOrigenRuta('casa')}
              >
                <Ionicons name="home" size={18} color={origenRuta === 'casa' ? '#FFF' : '#6C757D'} />
                <Text style={origenRuta === 'casa' ? styles.textoOpcionActivo : styles.textoOpcion}>Mi casa rentada</Text>
              </TouchableOpacity>
            </View>
          </View>

          {cargandoRuta ? (
            <ActivityIndicator style={styles.loaderRuta} color="#205EA6" />
          ) : plannedRoute ? (
            <View style={styles.detalleRuta}>
              <Text style={styles.tituloRuta}>
                {plannedRoute.type === 'direct' ? 'Ruta directa' : 'Ruta con transbordo'}
              </Text>
              {plannedRoute.segments.map((seg: any, i: number) => (
                <View key={i} style={styles.segmento}>
                  <View style={[styles.colorMuestra, { backgroundColor: seg.route.color }]} />
                  <Text style={styles.textoSegmento}>
                    Tomar {seg.route.name} de "{seg.fromStop.name}" a "{seg.toStop.name}"
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                style={styles.botonVerRutas}
                onPress={() => setShowRoutesList(true)}
              >
                <Ionicons name="list" size={18} color="#205EA6" />
                <Text style={styles.textoVerRutas}>Ver todas las rutas cercanas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.subtituloPanel}>No hay ruta de transporte cercana.</Text>
          )}

          <View style={styles.botonesAccion}>
            <TouchableOpacity style={styles.botonSecundario} onPress={() => setModo('buscando')}>
              <Ionicons name="search" size={18} color="#205EA6" />
              <Text style={styles.textoSecundario}>Buscar viviendas</Text>
            </TouchableOpacity>
            {propiedadRentada && (
              <TouchableOpacity
                style={styles.botonPrincipal}
                onPress={() => {
                  setPropiedadSeleccionada(propiedadRentada);
                  setModalVisible(true);
                }}
              >
                <Ionicons name="star" size={18} color="#FFF" />
                <Text style={styles.textoBoton}>Mi vivienda actual</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Modal de lista de rutas */}
      <RNModal visible={showRoutesList} animationType="slide" transparent>
        <View style={styles.modalRutasContainer}>
          <View style={styles.modalRutasContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Rutas de transporte cercanas</Text>
              <TouchableOpacity onPress={() => setShowRoutesList(false)}>
                <Ionicons name="close" size={26} color="#0F2C4F" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={routesList}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <View style={styles.rutaItem}>
                  <View style={[styles.colorMuestra, { backgroundColor: item.color, width: 24, height: 24, borderRadius: 12 }]} />
                  <View style={styles.rutaInfo}>
                    <Text style={styles.rutaNombre}>{item.routeName}</Text>
                    <Text style={styles.rutaDetalle}>Dirección: {item.direction === 'A' ? 'Ida' : 'Vuelta'}</Text>
                    <Text style={styles.rutaDetalle}>Distancia a parada: {item.distanceToStop} m</Text>
                    <Text style={styles.rutaDetalle}>Abordar en: {item.fromStop}</Text>
                    <Text style={styles.rutaDetalle}>Bajar en: {item.toStop}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.textoVacio}>No hay rutas cercanas</Text>}
            />
          </View>
        </View>
      </RNModal>

      <PropertyDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        propiedad={propiedadSeleccionada}
        puedeOpinar={modo === 'viviendo' && propiedadRentada?.id === propiedadSeleccionada?.id}
        onAlquilar={alquilarPropiedad}
        modoActual={modo}
        propiedadRentadaId={propiedadRentada?.id}
      />

      {/* Snackbar elegante */}
      {snackbarVisible && (
        <Animated.View style={[styles.snackbar, { transform: [{ translateY: snackbarAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }] }]}>
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0F2C4F' },
  mapa: { flex: 1 },
  controlButtons: { position: 'absolute', right: 16, top: height * 0.3, gap: 12 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 8 },
  marcadorEscuela: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#2B9348', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 8 },
  marcadorUsuario: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#205EA6', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 8 },
  pulso: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#205EA6', opacity: 0.3 },
  marcadorCasaRentada: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 8 },
  marcadorMiCasa: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFD966', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },
  pinPrecio: { backgroundColor: '#1a1a2e', borderRadius: 28, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 2, borderColor: '#FFF', elevation: 6, shadowColor: '#000', shadowOpacity: 0.3 },
  pinTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  panelBusqueda: { position: 'absolute', bottom: BOTTOM_SPACING, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 32, padding: 20, elevation: 12, shadowColor: '#000', shadowOpacity: 0.2 },
  panelViviendo: { position: 'absolute', bottom: BOTTOM_SPACING, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 32, padding: 20, alignItems: 'center', elevation: 12 },
  tituloPanel: { fontSize: 20, fontWeight: 'bold', color: '#0F2C4F', textAlign: 'center', marginBottom: 6 },
  subtituloPanel: { fontSize: 14, color: '#6C757D', textAlign: 'center', marginBottom: 16 },
  botonCambioModo: { backgroundColor: '#205EA6', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 40 },
  textoBoton: { color: '#FFF', fontWeight: 'bold' },
  switchContainer: { marginBottom: 16, width: '100%' },
  labelSwitch: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  switchWrapper: { flexDirection: 'row', gap: 12 },
  opcionSwitch: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 40, backgroundColor: '#F0F2F5' },
  opcionActiva: { backgroundColor: '#205EA6' },
  textoOpcion: { color: '#6C757D', fontWeight: '500' },
  textoOpcionActivo: { color: '#FFF', fontWeight: 'bold' },
  loaderRuta: { marginVertical: 12 },
  detalleRuta: { backgroundColor: '#F8F9FA', borderRadius: 20, padding: 12, width: '100%', marginBottom: 16 },
  tituloRuta: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  segmento: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  colorMuestra: { width: 20, height: 20, borderRadius: 10 },
  textoSegmento: { fontSize: 13, color: '#0F2C4F', flex: 1 },
  botonVerRutas: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E9ECEF' },
  textoVerRutas: { fontSize: 12, color: '#205EA6', fontWeight: '500' },
  botonesAccion: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  botonPrincipal: { flex: 1, backgroundColor: '#205EA6', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 40 },
  botonSecundario: { flex: 1, backgroundColor: '#E9ECEF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 12, borderRadius: 40 },
  textoSecundario: { color: '#205EA6', fontWeight: 'bold' },
  modalRutasContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalRutasContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: height * 0.7 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: '#0F2C4F' },
  rutaItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E9ECEF' },
  rutaInfo: { flex: 1 },
  rutaNombre: { fontSize: 16, fontWeight: 'bold', color: '#0F2C4F' },
  rutaDetalle: { fontSize: 12, color: '#6C757D', marginTop: 2 },
  textoVacio: { textAlign: 'center', color: '#6C757D', marginTop: 20 },
  snackbar: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#2B9348',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  snackbarText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});