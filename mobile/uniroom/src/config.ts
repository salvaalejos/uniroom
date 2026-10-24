/**
 * Configuración centralizada de URLs del backend.
 *
 * Si se definen EXPO_PUBLIC_API_URL y EXPO_PUBLIC_WS_URL en mobile/uniroom/.env,
 * se utilizan para conectar con el backend desplegado en la nube.
 * En caso contrario, detecta automáticamente la IP local de Expo.
 */
import Constants from 'expo-constants';

const LOCAL_HOST_IP = '192.168.100.97';

function buildLocalUrl(port: number): string {
  const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
  const host = hostUri || LOCAL_HOST_IP;
  return `http://${host}:${port}`;
}

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || buildLocalUrl(3000);

export const WS_URL: string =
  process.env.EXPO_PUBLIC_WS_URL || buildLocalUrl(3001);
