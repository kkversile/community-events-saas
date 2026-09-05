self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'CommunityHub', message: 'New community update' };
  event.waitUntil(self.registration.showNotification(data.title, { body: data.message, icon: '/pwa-192.png', data: { url: data.url || '/app/dashboard' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/app/dashboard', self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
    const existing = windowClients.find(client => client.url.startsWith(self.location.origin));
    return existing ? existing.focus().then(() => existing.navigate(targetUrl)) : clients.openWindow(targetUrl);
  }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.openWindow(event.notification.data?.url || '/app/dashboard')); });
