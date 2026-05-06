/**
 * Configuración centralizada de URLs del backend.
 *
 * - En desarrollo (__DEV__ = true): detecta la IP del equipo automáticamente
 *   usando el hostUri que provee Expo, para que dispositivos físicos se conecten.
 * - En producción (__DEV__ = false): usa el dominio público de producción.
 */
import Constants from 'expo-constants';

const PROD_API_URL = 'https://uniroomie.tech';
const PROD_WS_URL  = 'https://uniroomie.tech';

function buildDevUrl(port: number): string {
  const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
  return hostUri ? `http://${hostUri}:${port}` : `http://localhost:${port}`;
}

export const API_BASE_URL: string = __DEV__ ? buildDevUrl(3000) : PROD_API_URL;
export const WS_URL: string       = __DEV__ ? buildDevUrl(3001) : PROD_WS_URL;
