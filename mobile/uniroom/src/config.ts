/**
 * Configuración centralizada de URLs del backend (Modo Local).
 *
 * Detecta la IP del equipo automáticamente usando el hostUri de Expo
 * o usa la IP de red local (192.168.100.97) tanto en desarrollo como en el APK compilado.
 */
import Constants from 'expo-constants';

const LOCAL_HOST_IP = '192.168.100.97';

function buildLocalUrl(port: number): string {
  const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
  const host = hostUri || LOCAL_HOST_IP;
  return `http://${host}:${port}`;
}

export const API_BASE_URL: string = buildLocalUrl(3000);
export const WS_URL: string       = buildLocalUrl(3001);
