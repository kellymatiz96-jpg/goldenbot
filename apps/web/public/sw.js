// GoldenBot Service Worker — maneja notificaciones push en segundo plano

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recibir notificación push
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'GoldenBot', body: event.data.text() };
  }

  const title = data.title || 'GoldenBot';
  const options = {
    body: data.body || 'Tienes un mensaje nuevo',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.conversationId || 'goldenbot',
    renotify: true,
    data: { conversationId: data.conversationId },
    actions: [
      { action: 'open', title: 'Ver conversación' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click en la notificación — abrir el panel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const conversationId = event.notification.data?.conversationId;
  const url = conversationId
    ? `/dashboard/conversations?id=${conversationId}`
    : '/dashboard/conversations';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
