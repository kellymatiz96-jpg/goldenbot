'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationProvider() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    setPermission(Notification.permission);

    // Registrar el service worker
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('Error registrando SW:', err));
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        toast.error('Debes permitir las notificaciones para recibir alertas');
        return;
      }

      await subscribeUser();
      toast.success('Notificaciones activadas');
    } catch (err) {
      console.error('Error activando notificaciones:', err);
    }
  };

  const subscribeUser = async () => {
    const registration = await navigator.serviceWorker.ready;

    // Obtener la clave pública VAPID del backend
    const { data } = await api.get('/notifications/vapid-key');
    const publicKey = data.data?.publicKey;
    if (!publicKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subJson = subscription.toJSON();
    await api.post('/notifications/subscribe', {
      endpoint: subJson.endpoint,
      keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
    });
  };

  // Si ya tiene permiso, suscribir automáticamente sin mostrar botón
  useEffect(() => {
    if (permission === 'granted') {
      subscribeUser().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  if (permission === 'granted' || permission === 'denied') return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-white border border-amber-200 rounded-xl shadow-lg p-4 max-w-xs">
      <p className="text-sm font-semibold text-dark-900 mb-1">Activa las notificaciones</p>
      <p className="text-xs text-dark-500 mb-3">
        Recibe alertas cuando llegue un mensaje nuevo, aunque tengas el celular bloqueado.
      </p>
      <button
        onClick={requestPermission}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
      >
        Activar notificaciones
      </button>
    </div>
  );
}
