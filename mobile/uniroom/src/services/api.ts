import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000';

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