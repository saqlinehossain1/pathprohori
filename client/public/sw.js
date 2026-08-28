/* PATHPROHORI Service Worker for Browser Web Push Notifications */

self.addEventListener('push', function (event) {
  let data = {
    title: '🚨 PATHPROHORI Emergency Alert',
    body: 'An emergency signal was detected!',
    icon: '/favicon.ico',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.icon || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open_app', title: 'Open Dashboard' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
