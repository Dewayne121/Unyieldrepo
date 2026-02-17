import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBootstrap() {
  const { isAuthenticated } = useAuth();
  const { permissionStatus, registerForPushNotificationsAsync } = useNotifications();

  useEffect(() => {
    if (!isAuthenticated || permissionStatus !== 'granted') {
      return;
    }

    registerForPushNotificationsAsync({ requestIfNotGranted: false }).catch((error) => {
      console.error('Notification bootstrap registration failed:', error);
    });
  }, [isAuthenticated, permissionStatus, registerForPushNotificationsAsync]);

  return null;
}
