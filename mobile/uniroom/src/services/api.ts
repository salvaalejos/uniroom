import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

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

export const decidirRenta = (id: string, estado_renta: 'APROBADO' | 'RECHAZADO') =>
  apiRequest(`/citas/${id}/decision-renta`, {
    method: 'PUT',
    body: JSON.stringify({ estado_renta }),
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

export const obtenerPerfil = (userId: string) =>
  apiRequest(`/users/${userId}`);
