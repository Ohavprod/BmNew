// Service Worker מינימלי - מטרתו היחידה היא לאפשר "הוספה למסך הבית".
// הוא לא שומר קבצים במטמון, כדי שכל עדכון באתר יופיע ללקוחות מיד.
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
    // ללא טיפול מיוחד - הדפדפן ימשיך לטעון ישירות מהרשת כרגיל.
});
