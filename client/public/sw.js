/* PATHPROHORI Service Worker for Browser Web Push Notifications */

self.addEventListener('push', function (event) {
  let data = {
    title: '🚨 PATHPROHORI Emergency Alert',
    body: 'An emergency signal was detected!',
    icon: '/logo.png',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const targetUrl = data.data?.url || data.url || '/';

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    tag: data.tag || `emergency-alert-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: targetUrl,
    },
    actions: [
      { action: 'open_app', title: 'Open Live Stream' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const rawUrl = event.notification.data?.url || event.notification.data?.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // 1. If an open tab matches targetUrl exactly, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      // 2. If an open tab from this origin exists, focus and navigate to targetUrl
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('navigate' in client && 'focus' in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }

      // 3. Otherwise open new window at targetUrl
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

