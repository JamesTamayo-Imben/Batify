self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data?.json() || {}
  } catch (error) {
    console.error('Could not read push notification payload:', error)
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'Batify', {
    body: payload.body || 'You have a new update.',
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    data: { url: payload.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const requestedDestination = new URL(event.notification.data?.url || '/', self.location.origin)
  const destination = (requestedDestination.origin === self.location.origin ? requestedDestination : new URL('/', self.location.origin)).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(destination)
        return client.focus()
      }
    }
    return self.clients.openWindow(destination)
  })())
})
