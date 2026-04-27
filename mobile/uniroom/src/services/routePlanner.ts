import { getRouteWithTraffic } from './MapboxService';
import { TRANSPORT_ROUTES, TransportRoute, Stop } from './TransportRoutes';

const TEC_ITM = { latitude: 19.721869, longitude: -101.185483 };

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function findNearestStop(lat: number, lon: number, stops: Stop[], maxDistance = 200): { index: number; distanceMeters: number } | null {
  let minDist = Infinity;
  let idx = -1;
  for (let i = 0; i < stops.length; i++) {
    const d = getDistanceMeters(lat, lon, stops[i].latitude, stops[i].longitude);
    if (d < minDist && d <= maxDistance) {
      minDist = d;
      idx = i;
    }
  }
  return idx === -1 ? null : { index: idx, distanceMeters: minDist };
}

async function getRouteSegment(route: TransportRoute, startIdx: number, endIdx: number) {
  const step = startIdx <= endIdx ? 1 : -1;
  const selectedStops = [];
  for (let i = startIdx; step === 1 ? i <= endIdx : i >= endIdx; i += step) {
    selectedStops.push(route.stops[i]);
  }
  if (selectedStops.length < 2) return null;
  const trafficRoute = await getRouteWithTraffic(selectedStops);
  return trafficRoute ? trafficRoute.coords.map(c => [c.longitude, c.latitude]) : null;
}

export type PlannedRoute = {
  type: 'direct' | 'transfer';
  segments: {
    route: TransportRoute;
    coords: number[][];
    fromStop: Stop;
    toStop: Stop;
  }[];
};

export async function planRouteToSchool(originLat: number, originLng: number): Promise<PlannedRoute | null> {
  // Ruta directa
  for (const route of TRANSPORT_ROUTES) {
    const userStop = findNearestStop(originLat, originLng, route.stops, 200);
    const schoolStop = findNearestStop(TEC_ITM.latitude, TEC_ITM.longitude, route.stops, 200);
    if (userStop && schoolStop) {
      const coords = await getRouteSegment(route, userStop.index, schoolStop.index);
      if (coords) {
        return {
          type: 'direct',
          segments: [{
            route,
            coords,
            fromStop: route.stops[userStop.index],
            toStop: route.stops[schoolStop.index],
          }],
        };
      }
    }
  }

  // Combinación de dos rutas
  let bestTransfer: PlannedRoute | null = null;
  let bestScore = Infinity;

  for (const route1 of TRANSPORT_ROUTES) {
    const userStop1 = findNearestStop(originLat, originLng, route1.stops, 200);
    if (!userStop1) continue;

    for (const route2 of TRANSPORT_ROUTES) {
      if (route1.id === route2.id) continue;
      const schoolStop2 = findNearestStop(TEC_ITM.latitude, TEC_ITM.longitude, route2.stops, 200);
      if (!schoolStop2) continue;

      for (let i = 0; i < route1.stops.length; i++) {
        const stop1 = route1.stops[i];
        for (let j = 0; j < route2.stops.length; j++) {
          const stop2 = route2.stops[j];
          const distBetween = getDistanceMeters(stop1.latitude, stop1.longitude, stop2.latitude, stop2.longitude);
          if (distBetween <= 100) {
            const seg1 = await getRouteSegment(route1, userStop1.index, i);
            const seg2 = await getRouteSegment(route2, j, schoolStop2.index);
            if (seg1 && seg2) {
              const score = userStop1.distanceMeters + schoolStop2.distanceMeters + distBetween + seg1.length + seg2.length;
              if (score < bestScore) {
                bestScore = score;
                bestTransfer = {
                  type: 'transfer',
                  segments: [
                    { route: route1, coords: seg1, fromStop: route1.stops[userStop1.index], toStop: stop1 },
                    { route: route2, coords: seg2, fromStop: stop2, toStop: route2.stops[schoolStop2.index] },
                  ],
                };
              }
            }
          }
        }
      }
    }
  }

  return bestTransfer;
}

// Nueva función para obtener lista detallada de rutas cercanas (para el modal)
export type RouteDetail = {
  routeId: number;
  routeName: string;
  color: string;
  direction: 'A' | 'B';
  distanceToStop: number;
  fromStop: string;
  toStop: string;
};

export async function getNearbyRoutesDetails(originLat: number, originLng: number): Promise<RouteDetail[]> {
  const details: RouteDetail[] = [];

  for (const route of TRANSPORT_ROUTES) {
    const userStop = findNearestStop(originLat, originLng, route.stops, 200);
    if (!userStop) continue;
    const schoolStop = findNearestStop(TEC_ITM.latitude, TEC_ITM.longitude, route.stops, 200);
    if (!schoolStop) continue;

    // Determinar la dirección (si userStop.index <= schoolStop.index asumimos dirección A, si no, es inversa pero solo tenemos dirección A en stops)
    // Como solo tenemos una dirección, asumimos que la ruta es lineal y se puede recorrer en ambos sentidos? No, pero para el listado mostramos solo la dirección disponible.
    const direction = userStop.index <= schoolStop.index ? 'A' : 'A'; // En realidad solo hay A
    details.push({
      routeId: route.id,
      routeName: route.name,
      color: route.color,
      direction: 'A',
      distanceToStop: Math.round(userStop.distanceMeters),
      fromStop: route.stops[userStop.index].name,
      toStop: route.stops[schoolStop.index].name,
    });
  }
  // Ordenar por distancia
  details.sort((a, b) => a.distanceToStop - b.distanceToStop);
  return details;
}