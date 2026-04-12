import axios from "axios";

export type Coordinate = {
  latitude: number;
  longitude: number;
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN

export async function getRouteFromStops(
  stops: Coordinate[]
): Promise<Coordinate[]> {
  try {
    const coordinates = stops
      .map(c => `${c.longitude},${c.latitude}`)
      .join(";");

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
      `?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_TOKEN}`;

    const response = await axios.get(url);
    const coords = response.data.routes[0].geometry.coordinates;
    return coords.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0]
    }));
  } catch (error) {
    console.log("Error obteniendo ruta:", error);
    return [];
  }
}

export async function getRouteWithTraffic(
  stops: Coordinate[]
): Promise<{ coords: Coordinate[]; duration: number; distance: number } | null> {
  try {
    if (stops.length < 2) {
      console.log("Se necesitan al menos 2 puntos para trazar una ruta");
      return null;
    }

    const coordinates = stops
      .map(c => `${c.longitude},${c.latitude}`)
      .join(";");

    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}` +
      `?geometries=geojson&overview=full&steps=true` +
      `&annotations=duration,distance` +
      `&access_token=${MAPBOX_TOKEN}`;

    const response = await axios.get(url);
    
    if (!response.data.routes || response.data.routes.length === 0) {
      console.log("No se encontraron rutas");
      return null;
    }

    const route = response.data.routes[0];
    const coords = route.geometry.coordinates.map((c: number[]) => ({
      latitude: c[1],
      longitude: c[0]
    }));
    
    const durationInSeconds = route.duration;
    const durationInMinutes = Math.round(durationInSeconds / 60);
    
    const distanceInKm = route.distance / 1000;
    
    console.log(`Ruta encontrada: ${distanceInKm.toFixed(2)} km, ${durationInMinutes} min (con tráfico)`);
    
    return {
      coords,
      duration: durationInSeconds,
      distance: distanceInKm,
    };
  } catch (error) {
    console.error("Error obteniendo ruta con tráfico:", error);
    return null;
  }
}