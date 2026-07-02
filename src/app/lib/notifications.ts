import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeShell } from './platform';
import { APP_CONFIG } from './app-config';

let nativeListenerRegistered = false;
let nativeTapHandler: (() => void) | null = null;

export async function sendHealthCheckNotification(options: {
  entryId: string;
  address: string;
  onNativeTap?: () => void;
}) {
  if (isNativeShell()) {
    if (!nativeListenerRegistered && options.onNativeTap) {
      nativeListenerRegistered = true;
      nativeTapHandler = options.onNativeTap;
      await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const route = event.notification.extra?.route;
        if (route === '/profile?action=health-check') {
          nativeTapHandler?.();
        }
      });
    } else if (options.onNativeTap) {
      nativeTapHandler = options.onNativeTap;
    }

    const permissions = await LocalNotifications.checkPermissions();
    const displayState = permissions.display;
    if (displayState !== 'granted') {
      const requested = await LocalNotifications.requestPermissions();
      if (requested.display !== 'granted') {
        return false;
      }
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Number(options.entryId.replace(/\D/g, '').slice(-9) || Date.now().toString().slice(-9)),
          title: APP_CONFIG.healthCheckTitle,
          body: `You added ${options.address} over 48 hours ago but have not completed your tenancy health check yet.`,
          schedule: { at: new Date(Date.now() + 1000) },
          extra: { route: '/profile?action=health-check' },
        },
      ],
    });

    return true;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  const createNotification = () => {
    const notification = new Notification(APP_CONFIG.healthCheckTitle, {
      body: `You added ${options.address} over 48 hours ago but haven't completed your Tenancy Health Check. This 5-question assessment protects you from common landlord traps.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `ghar-health-check-${options.entryId}`,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      options.onNativeTap?.();
      notification.close();
    };
  };

  if (Notification.permission === 'granted') {
    createNotification();
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      createNotification();
      return true;
    }
  }

  return false;
}
