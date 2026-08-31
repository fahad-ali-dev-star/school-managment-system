/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// ─── PUSH EVENT HANDLER ──────────────────────────────────────────────────────
// Triggered on mobile device when the server sends a web push notification.
self.addEventListener('push', (event: ExtendableMessageEvent | any) => {
  if (!event.data) return;

  let payload: any = {};
  try {
    payload = event.data.json();
  } catch (err) {
    payload = {
      title: 'School Notification',
      body: event.data.text(),
    };
  }

  const title = payload.title || 'Beacon Light School';
  const options: any = {
    body: payload.body || 'You have a new school update.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    tag: payload.tag || `school-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: payload.url || '/parent/alerts',
      dateOfArrival: Date.now(),
      ...payload.data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK HANDLER ──────────────────────────────────────────────
// Triggered when the parent taps the popup on their mobile phone / lock screen.
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/parent/alerts';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList: readonly Client[]) => {
        // If an existing window is already open, focus it and navigate
        for (const client of clientList) {
          const win = client as WindowClient;
          if ('focus' in win) {
            win.navigate(targetUrl);
            return win.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

export {};
