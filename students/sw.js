// האתר עבר ל-avivwaiz.com — ה-service worker הזה מוחק את המטמון הישן, מבטל את עצמו ומעביר את המשתמש לכתובת החדשה.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const list = await self.clients.matchAll({ type: "window" });
    list.forEach((c) => c.navigate("https://avivwaiz.com/barmitzvah/students/"));
  })());
});
