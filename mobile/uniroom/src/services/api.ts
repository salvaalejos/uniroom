import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

async function getToken() {
  return await AsyncStorage.getItem('token');
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en la petición');
  }
  return response.json();
}

export const solicitarCita = (id_inmueble: number, fecha_hora: string) =>
  apiRequest('/citas/solicitar', {
    method: 'POST',
    body: JSON.stringify({ id_inmueble, fecha_hora }),
  });

export const obtenerMisCitas = () => apiRequest('/citas/mis-citas');

export const actualizarEstadoCita = (id: string, estado: string, motivo_rechazo?: string, nueva_fecha_hora?: string) =>
  apiRequest(`/citas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado, motivo_rechazo, nueva_fecha_hora }),
  });

export const decisionRenta = (id: string, decision: 'APROBAR' | 'RECHAZAR') =>
  apiRequest(`/citas/${id}/decision-renta`, {
    method: 'PUT',
    body: JSON.stringify({ decision }),
  });

export const marcarCitaRealizada = (id: string) =>
  apiRequest(`/citas/${id}/realizada`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });

export const obtenerHistorialPagos = () => apiRequest('/payments/history');

export const obtenerRentaActual = (userId: string) =>
  apiRequest(`/users/${userId}/renta-actual`);

export const cancelarRenta = (userId: string) =>
  apiRequest(`/users/${userId}/cancelar-renta`, {
    method: 'DELETE',
  });

export const crearCalificacion = (data: { id_inmueble: number; calificacion: number; comentario?: string }) =>
  apiRequest('/calificaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const crearCalificacionEstudiante = (data: { id_estudiante: string; calificacion: number; comentario?: string }) =>
  apiRequest('/calificaciones/estudiantes', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const obtenerMisInmuebles = (userId: string) =>
  apiRequest(`/inmuebles?arrendadorId=${userId}`);

export const eliminarInmuebleApi = (id: number) =>
  apiRequest(`/inmuebles/${id}`, {
    method: 'DELETE',
  });

export const obtenerInmueble = (id: number) =>
  apiRequest(`/inmuebles/${id}`);

export const obtenerInmueblesMapa = (filtrosActivos: any) => {
    let url = '/inmuebles';
    if (filtrosActivos) {
        const params = new URLSearchParams();
        if (filtrosActivos.precioMax && filtrosActivos.precioMax < 99999) params.append('precioMax', filtrosActivos.precioMax.toString());
        if (filtrosActivos.distanciaMax) params.append('distanciaMax', filtrosActivos.distanciaMax.toString());
        if (filtrosActivos.servicios?.length > 0) params.append('servicios', filtrosActivos.servicios.join(','));
        if (filtrosActivos.restricciones?.length > 0) params.append('restricciones', filtrosActivos.restricciones.join(','));
        if (filtrosActivos.calificacionMin > 0) params.append('calificacionMin', filtrosActivos.calificacionMin.toString());
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
    }
    return apiRequest(url);
};
