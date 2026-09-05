self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'CommunityHub', message: 'New community update' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.message, icon: '/pwa-192.png', data: { url: data.url || '/app/dashboard' } }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.openWindow(event.notification.data?.url || '/app/dashboard')); });
