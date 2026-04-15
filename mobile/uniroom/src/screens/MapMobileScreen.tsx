import { Ionicons } from '@expo/vector-icons';
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  TRANSPORT_ROUTES_BY_CATEGORY,
  TransportRoute,
} from "../services/TransportRoutes";

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
Mapbox.setAccessToken(MAPBOX_TOKEN);

const TEC_ITM = {
  latitude: 19.721869,
  longitude: -101.185483,
};

const { width, height } = Dimensions.get('window');
const MAX_DISTANCE_TO_ROUTE = 3; // km para considerar una ruta "cercana" al usuario
const TAB_BAR_HEIGHT = 70;
const BOTTOM_SPACING = TAB_BAR_HEIGHT + 16;

// 📏 Umbrales de distancia a la escuela (en metros)
const DISTANCE_NEAR_SCHOOL = 50;      // ≤50m: dentro de la escuela
const DISTANCE_VERY_CLOSE = 200;      // 50-200m: muy cerca (sugerencia opcional)
const DISTANCE_FAR_FROM_SCHOOL = 200; // >200m: lejos, mostrar rutas normalmente

export default function MapScreen() {
  const [activeRoutes, setActiveRoutes] = useState<TransportRoute[]>([]);
  const [routesCoords, setRoutesCoords] = useState<{ [key: number]: number[][] }>({});
  const [routesDirection, setRoutesDirection] = useState<{ [key: number]: string }>({});
  const [routesTime, setRoutesTime] = useState<{ [key: number]: number }>({});
  const [routesDistance, setRoutesDistance] = useState<{ [key: number]: number }>({});
  const [showRoutes, setShowRoutes] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [recommendedRoute, setRecommendedRoute] = useState<TransportRoute | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSubRoutes, setShowSubRoutes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState<number | null>(null);
  const [initialCameraSet, setInitialCameraSet] = useState(false);
  const [nearbyRoutes, setNearbyRoutes] = useState<string[]>([]);
  const [distanceToSchool, setDistanceToSchool] = useState<number | null>(null);
  const [userNearSchool, setUserNearSchool] = useState(false);
  
  const cameraRef = useRef<Mapbox.Camera>(null);
  const routeCache = useRef<{ [key: number]: number[][] }>({});
  const timeCache = useRef<{ [key: number]: number }>({});
  const distanceCache = useRef<{ [key: number]: number }>({});

  const categories = useMemo(() => Object.keys(TRANSPORT_ROUTES_BY_CATEGORY), []);
  
  const currentSubRoutes = useMemo(() => 
    selectedCategory ? TRANSPORT_ROUTES_BY_CATEGORY[selectedCategory] : [],
    [selectedCategory]
  );

  // 📏 Calcular distancia entre dos puntos (en metros)
  const getDistanceInMeters = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, []);

  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, []);

  const getRouteWithRealTimeTraffic = useCallback(async (stops: { latitude: number; longitude: number }[]) => {
    try {
      const result = await getRouteWithTraffic(stops);
      if (result && result.coords.length > 0) {
        return {
          coords: result.coords,
          duration: result.duration,
          distance: result.distance,
        };
      }
      return null;
    } catch (error) {
      console.error("Error obteniendo ruta con tráfico:", error);
      return null;
    }
  }, []);

  const getMinDistanceToRoute = useCallback((route: TransportRoute, userLat: number, userLon: number) => {
    let minDistance = Infinity;
    const allStops = [...route.directionA, ...route.directionB];
    for (const stop of allStops) {
      const distance = getDistance(userLat, userLon, stop.latitude, stop.longitude);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    return minDistance;
  }, [getDistance]);

  const findExactSchoolStop = useCallback((route: TransportRoute, useDirection: 'A' | 'B') => {
    const stopsToUse = useDirection === 'A' ? route.directionA : route.directionB;
    let minDistance = Infinity;
    let schoolIndex = -1;

    for (let i = 0; i < stopsToUse.length; i++) {
      const stop = stopsToUse[i];
      const distance = getDistance(TEC_ITM.latitude, TEC_ITM.longitude, stop.latitude, stop.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        schoolIndex = i;
      }
    }

    return { schoolIndex, schoolStop: schoolIndex !== -1 ? stopsToUse[schoolIndex] : null };
  }, [getDistance]);

  const getOptimizedStops = useCallback((route: TransportRoute, userIndex: number, schoolIndex: number, direction: 'A' | 'B') => {
    const stopsToUse = direction === 'A' ? route.directionA : route.directionB;
    const optimizedStops = [];
    
    if (schoolIndex >= userIndex) {
      for (let i = userIndex; i <= schoolIndex; i++) {
        optimizedStops.push(stopsToUse[i]);
      }
    } else {
      for (let i = userIndex; i >= schoolIndex; i--) {
        optimizedStops.push(stopsToUse[i]);
      }
    }
    
    return optimizedStops;
  }, []);

  const evaluateRouteForRecommendation = useCallback(async (route: TransportRoute, userLat: number, userLon: number) => {
    const distanceToRoute = getMinDistanceToRoute(route, userLat, userLon);
    if (distanceToRoute > MAX_DISTANCE_TO_ROUTE) {
      return null;
    }
    
    let bestResult = null;
    const directions = ['A', 'B'] as const;
    
    for (const dir of directions) {
      const stops = dir === 'A' ? route.directionA : route.directionB;
      
      let nearestIndex = -1;
      let minUserDist = Infinity;
      for (let i = 0; i < stops.length; i++) {
        const dist = getDistance(userLat, userLon, stops[i].latitude, stops[i].longitude);
        if (dist < minUserDist) {
          minUserDist = dist;
          nearestIndex = i;
        }
      }
      
      const { schoolIndex } = findExactSchoolStop(route, dir);
      
      if (nearestIndex !== -1 && schoolIndex !== -1) {
        const optimizedStops = getOptimizedStops(route, nearestIndex, schoolIndex, dir);
        
        if (optimizedStops.length > 0) {
          const routeWithTraffic = await getRouteWithRealTimeTraffic(optimizedStops);
          
          if (routeWithTraffic) {
            const score = (routeWithTraffic.duration / 60) * 0.5 + (routeWithTraffic.distance * 2);
            
            if (!bestResult || score < bestResult.score) {
              bestResult = {
                direction: dir,
                score: score,
                estimatedTime: Math.round(routeWithTraffic.duration / 60),
                distance: routeWithTraffic.distance,
                optimizedStops,
              };
            }
          }
        }
      }
    }
    
    return bestResult;
  }, [getDistance, getMinDistanceToRoute, findExactSchoolStop, getOptimizedStops, getRouteWithRealTimeTraffic]);

  useEffect(() => {
    let isMounted = true;
    
    async function getUserLocation() {
      try {
        setIsLoading(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) {
            Alert.alert("Ubicación requerida", "Para usar esta aplicación, necesitamos acceder a tu ubicación.");
            setIsLoading(false);
          }
          return;
        }
        const location = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.High
        });
        if (isMounted) {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
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

  const centerOnUserLocation = useCallback(() => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 15,
        animationDuration: 500,
      });
    }
  }, [userLocation]);

  const centerOnSchool = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [TEC_ITM.longitude, TEC_ITM.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
  }, []);

  // 📍 Detectar si el usuario está cerca de la escuela
  useEffect(() => {
    if (!userLocation) return;
    
    const distance = getDistanceInMeters(
      userLocation.latitude,
      userLocation.longitude,
      TEC_ITM.latitude,
      TEC_ITM.longitude
    );
    
    setDistanceToSchool(Math.round(distance));
    setUserNearSchool(distance <= DISTANCE_NEAR_SCHOOL);
    
  }, [userLocation, getDistanceInMeters]);

  // 🚌 Evaluar rutas solo si el usuario NO está dentro de la escuela
  useEffect(() => {
    if (!userLocation) return;
    
    // Si está cerca de la escuela (≤50m), no evaluar rutas
    if (userNearSchool) {
      setRecommendedRoute(null);
      setNearbyRoutes([]);
      return;
    }
    
    const evaluateRoutes = async () => {
      let bestRoute: TransportRoute | null = null;
      let bestEvaluation: any = null;
      const nearbyRoutesList: string[] = [];
      
      const allRoutes = Object.values(TRANSPORT_ROUTES_BY_CATEGORY).flat();
      
      for (const route of allRoutes) {
        const evaluation = await evaluateRouteForRecommendation(route, userLocation.latitude, userLocation.longitude);
        if (evaluation) {
          nearbyRoutesList.push(route.name);
          if (!bestEvaluation || evaluation.score < bestEvaluation.score) {
            bestEvaluation = evaluation;
            bestRoute = route;
            timeCache.current[route.id] = evaluation.estimatedTime;
            distanceCache.current[route.id] = evaluation.distance;
          }
        }
      }
      
      setNearbyRoutes(nearbyRoutesList);
      setRecommendedRoute(bestRoute);
    };
    
    evaluateRoutes();
  }, [userLocation, userNearSchool, evaluateRouteForRecommendation]);

  const handleRoutePress = useCallback(async (route: TransportRoute) => {
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
      
      let bestResult: {
        direction: 'A' | 'B';
        coords: any[];
        duration: number;
        distance: number;
        optimizedStops: any[];
      } | null = null;
      
      const directions = ['A', 'B'] as const;
      
      for (const dir of directions) {
        const stops = dir === 'A' ? route.directionA : route.directionB;
        
        let nearestIndex = -1;
        let minUserDist = Infinity;
        for (let i = 0; i < stops.length; i++) {
          const dist = getDistance(userLocation.latitude, userLocation.longitude, stops[i].latitude, stops[i].longitude);
          if (dist < minUserDist) {
            minUserDist = dist;
            nearestIndex = i;
          }
        }
        
        const { schoolIndex } = findExactSchoolStop(route, dir);
        
        if (nearestIndex !== -1 && schoolIndex !== -1) {
          const optimizedStops = getOptimizedStops(route, nearestIndex, schoolIndex, dir);
          
          if (optimizedStops.length > 0) {
            const routeWithTraffic = await getRouteWithRealTimeTraffic(optimizedStops);
            
            if (routeWithTraffic) {
              const currentScore = (routeWithTraffic.duration / 60) * 0.5 + (routeWithTraffic.distance * 2);
              
              if (!bestResult) {
                bestResult = {
                  direction: dir,
                  coords: routeWithTraffic.coords,
                  duration: routeWithTraffic.duration,
                  distance: routeWithTraffic.distance,
                  optimizedStops,
                };
              } else {
                const bestScore = (bestResult.duration / 60) * 0.5 + (bestResult.distance * 2);
                if (currentScore < bestScore) {
                  bestResult = {
                    direction: dir,
                    coords: routeWithTraffic.coords,
                    duration: routeWithTraffic.duration,
                    distance: routeWithTraffic.distance,
                    optimizedStops,
                  };
                }
              }
            }
          }
        }
      }
      
      if (!bestResult) {
        setIsLoadingRoute(null);
        Alert.alert("Ruta no disponible", "No se pudo encontrar un camino válido hacia la escuela.");
        return;
      }
      
      setRoutesDirection(prev => ({ ...prev, [route.id]: bestResult.direction }));
      setRoutesTime(prev => ({ ...prev, [route.id]: Math.round(bestResult.duration / 60) }));
      setRoutesDistance(prev => ({ ...prev, [route.id]: bestResult.distance }));
      
      const formattedCoords = bestResult.coords.map((c: any) => [c.longitude, c.latitude]);
      routeCache.current[route.id] = formattedCoords;
      
      setRoutesCoords(prev => ({ ...prev, [route.id]: formattedCoords }));
      setActiveRoutes((prev) => [...prev, route]);
      setIsLoadingRoute(null);
      
    } catch (error) {
      console.error("Error al seleccionar ruta:", error);
      setIsLoadingRoute(null);
      Alert.alert("Error", "No se pudo cargar la ruta seleccionada.");
    }
  }, [activeRoutes, userLocation, getDistance, findExactSchoolStop, getOptimizedStops, getRouteWithRealTimeTraffic]);

  const handleClearAllRoutes = useCallback(() => {
    Alert.alert(
      "Limpiar rutas",
      "¿Deseas eliminar todas las rutas seleccionadas del mapa?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Limpiar", onPress: () => {
          setActiveRoutes([]);
          setRoutesCoords({});
          setRoutesDirection({});
          setRoutesTime({});
          setRoutesDistance({});
        }, style: "destructive" },
      ]
    );
  }, []);

  const handleCategorySelect = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
    setShowSubRoutes(true);
  }, []);

  const handleBackToCategories = useCallback(() => {
    setShowSubRoutes(false);
    setSelectedCategory(null);
  }, []);

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

  // 🎯 Mensaje según distancia a la escuela
  const getProximityMessage = () => {
    if (!distanceToSchool) return null;
    if (distanceToSchool <= DISTANCE_NEAR_SCHOOL) {
      return "🎓 ¡Ya estás en la escuela! No necesitas una ruta.";
    }
    if (distanceToSchool <= DISTANCE_VERY_CLOSE) {
      return "Estás muy cerca de la escuela. ¿Seguro que necesitas una ruta?";
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#205EA6" />
        <Text style={styles.loadingText}>Localizando tu posición...</Text>
        <Text style={styles.loadingSubtext}>Buscando las mejores rutas para ti</Text>
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
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
            </View>
          </Mapbox.PointAnnotation>
        )}

        <Mapbox.PointAnnotation
          id="school"
          coordinate={[TEC_ITM.longitude, TEC_ITM.latitude]}
        >
          <View style={styles.schoolMarker}>
            <Ionicons name="business" size={22} color="#FFFFFF" />
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
                id={`outline-${route.id}`}
                style={{
                  lineWidth: 10,
                  lineColor: "#FFFFFF",
                  lineOpacity: 0.85,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
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

      {/* Botón principal de rutas - solo visible si no está dentro de la escuela */}
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
              {showSubRoutes && (
                <TouchableOpacity style={styles.iconBtn} onPress={handleBackToCategories}>
                  <Ionicons name="arrow-back" size={22} color="#205EA6" />
                </TouchableOpacity>
              )}
              <Text style={styles.panelTitle}>
                {showSubRoutes ? `Rutas ${selectedCategory}` : "Líneas de Transporte"}
              </Text>
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

          {recommendedRoute && !userNearSchool && (
            <View style={styles.recommendBox}>
              <View style={styles.recommendHeader}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.recommendTitle}>Ruta Recomendada</Text>
                <View style={styles.recommendBadge}>
                  <Text style={styles.recommendBadgeText}>MÁS RÁPIDA</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.recommendCard,
                  activeRoutes.some(r => r.id === recommendedRoute.id) && styles.activeRecommend
                ]}
                onPress={() => handleRoutePress(recommendedRoute)}
              >
                <View style={[styles.recommendColor, { backgroundColor: recommendedRoute.color }]} />
                <View style={styles.recommendInfo}>
                  <Text style={styles.recommendText}>{recommendedRoute.name}</Text>
                  <Text style={styles.recommendTime}>
                    <Ionicons name="time-outline" size={12} color="#6C757D" /> {formatTime(timeCache.current[recommendedRoute.id] || 15)} • 
                    <Ionicons name="resize-outline" size={12} color="#6C757D" /> {formatDistance(distanceCache.current[recommendedRoute.id] || 0)}
                  </Text>
                </View>
                {isLoadingRoute === recommendedRoute.id ? (
                  <ActivityIndicator size="small" color="#205EA6" />
                ) : activeRoutes.some(r => r.id === recommendedRoute.id) && (
                  <Ionicons name="checkmark-circle" size={22} color="#2B9348" />
                )}
              </TouchableOpacity>
            </View>
          )}

          {!showSubRoutes ? (
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              renderItem={({ item }) => {
                const color = TRANSPORT_ROUTES_BY_CATEGORY[item][0]?.color || "#ccc";
                const count = TRANSPORT_ROUTES_BY_CATEGORY[item].length;
                const hasNearby = nearbyRoutes.some(name => 
                  TRANSPORT_ROUTES_BY_CATEGORY[item].some(r => r.name === name)
                );
                return (
                  <TouchableOpacity style={styles.categoryCard} onPress={() => handleCategorySelect(item)}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryCircle, { backgroundColor: color }]} />
                      <View>
                        <Text style={styles.categoryName}>{item}</Text>
                        <Text style={styles.categoryCount}>{count} {count === 1 ? "ruta" : "rutas"}</Text>
                      </View>
                    </View>
                    {hasNearby && (
                      <View style={styles.nearbyBadge}>
                        <Text style={styles.nearbyBadgeText}>Cerca</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color="#CED4DA" />
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <FlatList
              data={currentSubRoutes}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              renderItem={({ item }) => {
                const isActive = activeRoutes.some((r) => r.id === item.id);
                const direction = routesDirection[item.id];
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
                      {direction && estimatedTime && (
                        <Text style={styles.routeDetail}>
                          {direction === 'A' ? 'Sentido normal' : 'Sentido inverso'} • {formatTime(estimatedTime)} • {formatDistance(estimatedDistance)}
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
          )}
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
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.8,
  },
  controlButtons: {
    position: "absolute",
    right: 16,
    top: height * 0.3,
    gap: 12,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  userMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#205EA6",
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
  userMarkerPulse: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
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
    height: height * 0.55,
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
  recommendBox: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#DCEEFF",
  },
  recommendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  recommendTitle: {
    fontSize: 13,
    color: "#205EA6",
    fontWeight: "600",
  },
  recommendBadge: {
    backgroundColor: "#FFB800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  recommendBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  recommendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCEEFF",
  },
  activeRecommend: {
    backgroundColor: "#F0F7FF",
    borderColor: "#205EA6",
  },
  recommendColor: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  recommendInfo: {
    flex: 1,
  },
  recommendText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F2C4F",
  },
  recommendTime: {
    fontSize: 11,
    color: "#6C757D",
    marginTop: 2,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#0F2C4F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F2C4F",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6C757D",
  },
  nearbyBadge: {
    backgroundColor: "#2B9348",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  nearbyBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  activeRoute: {
    backgroundColor: "#DCEEFF",
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
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
    fontSize: 11,
    color: "#6C757D",
    marginTop: 2,
  },
});