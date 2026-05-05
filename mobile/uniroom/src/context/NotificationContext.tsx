import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const BACKEND_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

interface NotificationContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('userRole'); // Necesitaremos guardar esto en el login

      if (!token || !userId) return;

      // 1. Cargar notificaciones de la BD
      const respNotif = await fetch(`${BACKEND_URL}/api/notificaciones/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let count = 0;
      if (respNotif.ok) {
        const notifs = await respNotif.json();
        count += notifs.filter((n: any) => !n.visto).length;
      }

      // 2. Cargar citas pendientes (lógica similar a NotificationScreen)
      const respCitas = await fetch(`${BACKEND_URL}/citas/mis-citas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (respCitas.ok) {
        const citas = await respCitas.json();
        const roleLower = role?.toLowerCase() || '';
        
        const unreadCitas = citas.filter((cita: any) => {
          if (roleLower === 'arrendador') {
            // Un arrendador tiene citas "no vistas" si están PENDIENTES o si acaba de hacerse REALIZADA (esperando decisión)
            return cita.estado === 'PENDIENTE' || cita.estado === 'REALIZADA';
          } else {
            // Un estudiante tiene citas "no vistas" si están ACEPTADAS, RECHAZADAS o RENTA_APROBADA/RECHAZADA
            // (Esta es una simplificación, en un sistema real tendríamos un campo 'visto' en la tabla Cita)
            return cita.estado !== 'PENDIENTE'; 
          }
        });
        count += unreadCitas.length;
      }

      setUnreadCount(count);
    } catch (error) {
      console.error("Error refreshing unread count:", error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
