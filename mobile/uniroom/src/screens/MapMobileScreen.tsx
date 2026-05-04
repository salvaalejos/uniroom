import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getRouteWithTraffic } from "../services/MapboxService";
import {
  TRANSPORT_ROUTES,
  TransportRoute,
} from "../services/TransportRoutes";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
Mapbox.setAccessToken(MAPBOX_TOKEN);

const TEC_ITM = {
  latitude: 19.721869,
  longitude: -101.185483,
};

const { width, height } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const BOTTOM_SPACING = TAB_BAR_HEIGHT + 16;

const DISTANCE_NEAR_SCHOOL = 50;
const DISTANCE_VERY_CLOSE = 200;

export default function MapScreen() {
  const [activeRoutes, setActiveRoutes] = useState<TransportRoute[]>([]);
  const [routesCoords, setRoutesCoords] = useState<{ [key: number]: number[][] }>({});
  const [routesTime, setRoutesTime] = useState<{ [key: number]: number }>({});
  const [routesDistance, setRoutesDistance] = useState<{ [key: number]: number }>({});
  const [showRoutes, setShowRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [recommendedRoute, setRecommendedRoute] = useState<TransportRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState<number | null>(null);
  const [initialCameraSet, setInitialCameraSet] = useState(false);
  const [distanceToSchool, setDistanceToSchool] = useState<number | null>(null);
  const [userNearSchool, setUserNearSchool] = useState(false);
  
  const cameraRef = useRef<Mapbox.Camera>(null);
  const routeCache = useRef<{ [key: number]: number[][] }>({});

  const allRoutes = TRANSPORT_ROUTES;

  const getDistanceInMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, []);

  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    return getDistanceInMeters(lat1, lon1, lat2, lon2) / 1000;
  }, [getDistanceInMeters]);

  const getRouteWithRealTimeTraffic = useCallback(async (stops: { latitude: number; longitude: number }[]) => {
    try {
      return await getRouteWithTraffic(stops);
    } catch (error) {
      console.error("Error obteniendo ruta con tráfico:", error);
      return null;
    }
  }, []);

  const getOptimizedStops = useCallback((route: TransportRoute, userLat: number, userLon: number) => {
    let nearestIndex = -1;
    let minUserDist = Infinity;
    
    for (let i = 0; i < route.stops.length; i++) {
      const dist = getDistance(userLat, userLon, route.stops[i].latitude, route.stops[i].longitude);
      if (dist < minUserDist) {
        minUserDist = dist;
        nearestIndex = i;
      }
    }

    let schoolIndex = -1;
    let minSchoolDist = Infinity;
    for (let i = 0; i < route.stops.length; i++) {
      const dist = getDistance(TEC_ITM.latitude, TEC_ITM.longitude, route.stops[i].latitude, route.stops[i].longitude);
      if (dist < minSchoolDist) {
        minSchoolDist = dist;
        schoolIndex = i;
      }
    }

    if (nearestIndex === -1 || schoolIndex === -1) return null;

    const optimized = [];
    if (schoolIndex >= nearestIndex) {
      for (let i = nearestIndex; i <= schoolIndex; i++) optimized.push(route.stops[i]);
    } else {
      for (let i = nearestIndex; i >= schoolIndex; i--) optimized.push(route.stops[i]);
    }
    return optimized;
  }, [getDistance]);

  useEffect(() => {
    let isMounted = true;
    async function getUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setIsLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (isMounted) {
          setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
        }
      } catch (error) {
        console.error("Error obteniendo ubicación:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    getUserLocation();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (mapReady && cameraRef.current && userLocation && !initialCameraSet) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 14,
        animationDuration: 0,
      });
      setInitialCameraSet(true);
    }
  }, [userLocation, mapReady, initialCameraSet]);

  const centerOnUserLocation = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: [userLocation.longitude, userLocation.latitude], zoomLevel: 15, animationDuration: 500 });
    }
  };

  const centerOnSchool = () => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({ centerCoordinate: [TEC_ITM.longitude, TEC_ITM.latitude], zoomLevel: 16, animationDuration: 500 });
    }
  };

  useEffect(() => {
    if (!userLocation) return;
    const distance = getDistanceInMeters(userLocation.latitude, userLocation.longitude, TEC_ITM.latitude, TEC_ITM.longitude);
    setDistanceToSchool(Math.round(distance));
    setUserNearSchool(distance <= DISTANCE_NEAR_SCHOOL);
  }, [userLocation, getDistanceInMeters]);

  useEffect(() => {
    if (!userLocation || userNearSchool) {
      setRecommendedRoute(null);
      return;
    }
    if (allRoutes.length > 0) {
      setRecommendedRoute(allRoutes[0]);
    }
  }, [userLocation, userNearSchool]);

  const handleRoutePress = async (route: TransportRoute) => {
    try {
      const exists = activeRoutes.find((r) => r.id === route.id);
      if (exists) {
        setActiveRoutes((prev) => prev.filter((r) => r.id !== route.id));
        return;
      }
      
      if (!userLocation) return;
      setIsLoadingRoute(route.id);
      
      if (routeCache.current[route.id]) {
        setRoutesCoords(prev => ({ ...prev, [route.id]: routeCache.current[route.id] }));
        setActiveRoutes((prev) => [...prev, route]);
        setIsLoadingRoute(null);
        return;
      }
      
      const optimizedStops = getOptimizedStops(route, userLocation.latitude, userLocation.longitude);
      if (!optimizedStops || optimizedStops.length < 2) {
        setIsLoadingRoute(null);
        Alert.alert("Ruta no disponible", "No estás cerca de esta ruta o no lleva a la escuela.");
        return;
      }

      const result = await getRouteWithRealTimeTraffic(optimizedStops);
      if (result) {
        const formattedCoords = result.coords.map((c: any) => [c.longitude, c.latitude]);
        routeCache.current[route.id] = formattedCoords;
        setRoutesCoords(prev => ({ ...prev, [route.id]: formattedCoords }));
        setRoutesTime(prev => ({ ...prev, [route.id]: Math.round(result.duration / 60) }));
        setRoutesDistance(prev => ({ ...prev, [route.id]: result.distance }));
        setActiveRoutes((prev) => [...prev, route]);
      } else {
        Alert.alert("Error", "No se pudo trazar la ruta.");
      }
      setIsLoadingRoute(null);
    } catch (error) {
      console.error(error);
      setIsLoadingRoute(null);
    }
  };

  const handleClearAllRoutes = () => {
    setActiveRoutes([]);
    setRoutesCoords({});
    setRoutesTime({});
    setRoutesDistance({});
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const getProximityMessage = () => {
    if (!distanceToSchool) return null;
    if (distanceToSchool <= DISTANCE_NEAR_SCHOOL) return "🎓 ¡Ya estás en la escuela!";
    if (distanceToSchool <= DISTANCE_VERY_CLOSE) return "Estás muy cerca de la escuela.";
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#205EA6" />
        <Text style={styles.loadingText}>Localizando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F2C4F" />
      
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/streets-v12"
        logoEnabled={false}
        attributionEnabled={false}
        onDidFinishLoadingMap={() => setMapReady(true)}
      >
        <Mapbox.Camera ref={cameraRef} />
        
        {userLocation && (
          <Mapbox.PointAnnotation
            id="user"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerPulse} />
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
          </Mapbox.PointAnnotation>
        )}

        <Mapbox.PointAnnotation
          id="school"
          coordinate={[TEC_ITM.longitude, TEC_ITM.latitude]}
        >
          <View style={styles.schoolMarker}>
            <Ionicons name="school" size={26} color="#FFFFFF" />
          </View>
        </Mapbox.PointAnnotation>

        {activeRoutes.map((route) => {
          const coords = routesCoords[route.id];
          if (!coords) return null;
          return (
            <Mapbox.ShapeSource
              key={`route-${route.id}`}
              id={`route-${route.id}`}
              shape={{
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: coords },
              }}
            >
              <Mapbox.LineLayer
                id={`line-${route.id}`}
                style={{
                  lineWidth: 5,
                  lineColor: route.color,
                  lineCap: "round",
                  lineJoin: "round",
                  lineOpacity: 0.95,
                }}
              />
            </Mapbox.ShapeSource>
          );
        })}
      </Mapbox.MapView>

      {/* Botones de control del mapa */}
      <View style={styles.controlButtons}>
        <TouchableOpacity style={styles.controlBtn} onPress={centerOnUserLocation} activeOpacity={0.8}>
          <Ionicons name="locate" size={22} color="#205EA6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={centerOnSchool} activeOpacity={0.8}>
          <Ionicons name="business" size={22} color="#205EA6" />
        </TouchableOpacity>
      </View>

      {/* Botón principal de rutas */}
      {!userNearSchool && (
        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => setShowRoutes(!showRoutes)}
          activeOpacity={0.9}
        >
          <Ionicons name="bus-outline" size={20} color="#FFFFFF" />
          <Text style={styles.mainButtonText}>Explorar Rutas</Text>
        </TouchableOpacity>
      )}

      {/* Mensaje de proximidad a la escuela */}
      {getProximityMessage() && (
        <View style={styles.proximityMessage}>
          <Ionicons name="information-circle" size={18} color="#FFFFFF" />
          <Text style={styles.proximityMessageText}>{getProximityMessage()}</Text>
        </View>
      )}

      {showRoutes && !userNearSchool && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.panelTitle}>Rutas de Transporte</Text>
            </View>
            <View style={styles.headerRight}>
              {activeRoutes.length > 0 && (
                <TouchableOpacity style={styles.iconBtn} onPress={handleClearAllRoutes}>
                  <Ionicons name="trash-outline" size={18} color="#DC2F02" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowRoutes(false)}>
                <Ionicons name="close" size={22} color="#6C757D" />
              </TouchableOpacity>
            </View>
          </View>

          {recommendedRoute && !activeRoutes.some(r => r.id === recommendedRoute.id) && (
            <TouchableOpacity
              style={styles.recommendCard}
              onPress={() => handleRoutePress(recommendedRoute)}
            >
              <View style={[styles.recommendColor, { backgroundColor: recommendedRoute.color }]} />
              <View style={styles.recommendInfo}>
                <Text style={styles.recommendText}>Recomendada: {recommendedRoute.name}</Text>
              </View>
              {isLoadingRoute === recommendedRoute.id ? (
                <ActivityIndicator size="small" color="#205EA6" />
              ) : (
                <Ionicons name="star" size={18} color="#FFB800" />
              )}
            </TouchableOpacity>
          )}

          <FlatList
            data={allRoutes}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isActive = activeRoutes.some((r) => r.id === item.id);
              const estimatedTime = routesTime[item.id];
              const estimatedDistance = routesDistance[item.id];
              return (
                <TouchableOpacity
                  style={[styles.routeCard, isActive && styles.activeRoute]}
                  onPress={() => handleRoutePress(item)}
                >
                  <View style={[styles.routeDot, { backgroundColor: item.color }]} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeName}>{item.name}</Text>
                    {estimatedTime && (
                      <Text style={styles.routeDetail}>
                        {formatTime(estimatedTime)} • {formatDistance(estimatedDistance)}
                      </Text>
                    )}
                  </View>
                  {isLoadingRoute === item.id ? (
                    <ActivityIndicator size="small" color="#205EA6" />
                  ) : isActive && <Ionicons name="checkmark" size={18} color="#2B9348" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F2C4F",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F2C4F",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#DCEEFF",
    fontWeight: "600",
  },
  controlButtons: {
    position: "absolute",
    right: 16,
    top: height * 0.3,
    gap: 12,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F2C4F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  mainButton: {
    position: "absolute",
    bottom: BOTTOM_SPACING + 10,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#205EA6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 40,
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F2C4F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  proximityMessage: {
    position: "absolute",
    bottom: BOTTOM_SPACING + 80,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#0F2C4F",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 30,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#205EA6",
  },
  proximityMessageText: {
    color: "#DCEEFF",
    fontSize: 13,
    fontWeight: "500",
  },
  userMarkerContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#205EA6",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  userMarkerPulse: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#205EA6",
    opacity: 0.3,
  },
  schoolMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2B9348",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F2C4F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  }, 
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#0F2C4F",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCEEFF",
    justifyContent: "center",
    alignItems: "center",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F2C4F",
  },
  recommendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    margin: 15,
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCEEFF",
  },
  recommendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  recommendInfo: {
    flex: 1,
  },
  recommendText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F2C4F",
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  activeRoute: {
    backgroundColor: "#F8F9FA",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0F2C4F",
  },
  routeDetail: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 2,
  },
});