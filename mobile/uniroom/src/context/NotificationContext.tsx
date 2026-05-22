import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as BACKEND_URL } from '../config';

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
