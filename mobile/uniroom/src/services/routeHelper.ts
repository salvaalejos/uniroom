import { getRouteWithTraffic } from './MapboxService';
import { TRANSPORT_ROUTES, TransportRoute } from './TransportRoutes';

const TEC_ITM = { latitude: 19.721869, longitude: -101.185483 };

// Distancia en metros (para el umbral de 150 m)
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function findNearestStop(lat: number, lon: number, stops: { latitude: number; longitude: number }[]) {
  let minDist = Infinity;
  let idx = -1;
  for (let i = 0; i < stops.length; i++) {
    const d = getDistanceInMeters(lat, lon, stops[i].latitude, stops[i].longitude);
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }
  return { index: idx, distanceMeters: minDist };
}

export type NearbyRoute = {
  routeId: number;
  routeName: string;
  color: string;
  distanceToStop: number; // metros
  coords: number[][]; // línea de ruta completa
};

// Obtener todas las rutas que tengan una parada a menos de 150 m del origen
export async function getNearbyRoutes(originLat: number, originLng: number): Promise<NearbyRoute[]> {
  const allRoutes = TRANSPORT_ROUTES;
  const nearby: NearbyRoute[] = [];

  for (const route of allRoutes) {
    const stops = route.stops;
    const { distanceMeters } = findNearestStop(originLat, originLng, stops);
    
    if (distanceMeters <= 250) { // Umbral aumentado para desarrollo
      const schoolStopIndex = findNearestStop(TEC_ITM.latitude, TEC_ITM.longitude, stops).index;
      const userStopIndex = findNearestStop(originLat, originLng, stops).index;
      
      if (schoolStopIndex === -1 || userStopIndex === -1) continue;

      let start = userStopIndex;
      let end = schoolStopIndex;
      
      let step = start <= end ? 1 : -1;
      const selectedStops = [];
      for (let i = start; step === 1 ? i <= end : i >= end; i += step) {
        selectedStops.push(stops[i]);
      }
      
      if (selectedStops.length < 2) continue;

      try {
        const routeData = await getRouteWithTraffic(selectedStops);
        if (routeData && routeData.coords.length > 0) {
          nearby.push({
            routeId: route.id,
            routeName: route.name,
            color: route.color,
            distanceToStop: distanceMeters,
            coords: routeData.coords.map(c => [c.longitude, c.latitude]),
          });
        }
      } catch (e) {
        console.warn(`Error calculando ruta para ${route.name}`);
      }
    }
  }

  // Ordenar por distancia a la parada (más cercana primero)
  nearby.sort((a, b) => a.distanceToStop - b.distanceToStop);
  return nearby;
}