/* KALOS — Service Worker: עבודה בלי אינטרנט (למשל בפארק)
   - ניווט: רשת קודם, ואם אין חיבור — index.html מהמטמון
   - קבצים מקומיים: stale-while-revalidate (מהיר, ומתעדכן ברקע)
   - גופנים ותמונות מקומיים: גופנים במטמון מראש, תמונות נשמרות כשהן נצפות
   - אין תלות ברשת חיצונית: סרטוני ההדרכה (Cali / Stheni) נוצרים בדפדפן
   - בקשות OpenStreetMap (מצא פארק) ומפות מוטמעות עוברות ישר לרשת ולא נשמרות */
const VERSION = 'kalos-v10'; /* להעלות בכל שינוי בקבצים המקומיים */
const CORE = VERSION + '-core';
const RUNTIME = VERSION + '-runtime';
const RUNTIME_MAX = 120;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/fonts.css',
  'assets/css/style.css',
  'assets/css/workout.css',
  'assets/css/me.css',
  'assets/css/skilltree.css',
  'assets/css/tools.css',
  'assets/css/kalo.css',
  'assets/css/parks.css',
  'assets/css/programs.css',
  'assets/css/my.css',
  'assets/css/a11y.css',
  'assets/css/responsive.css',
  'assets/js/figure.js',
  'assets/js/data.js',
  'assets/js/exercises-extra.js',
  'assets/js/exercises-more.js',
  'assets/js/exercises-plus.js',
  'assets/js/kalo.js',
  'assets/js/builder.js',
  'assets/js/core.js',
  'assets/js/a11y.js',
  'assets/js/i18n.js',
  'assets/i18n/en.js',
  'assets/js/features-data.js',
  'assets/js/theme.js',
  'assets/js/skilltree.js',
  'assets/js/assess.js',
  'assets/js/tools.js',
  'assets/js/workout.js',
  'assets/js/programs-plan.js',
  'assets/js/tracker.js',
  'assets/js/my.js',
  'assets/js/share.js',
  'assets/js/app.js',
  'assets/js/parks.js',
  'assets/js/pwa.js',
  'assets/fonts/heebo-hebrew.woff2',
  'assets/fonts/heebo-latin.woff2',
  'assets/fonts/rubik-hebrew.woff2',
  'assets/fonts/rubik-latin.woff2',
  'assets/img/flag-s.webp',
  'assets/img/flag-l.webp',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
];

const RUNTIME_HOSTS = [];
const NEVER_CACHE = /(^|\.)youtube(-nocookie)?\.com$|(^|\.)googlevideo\.com$/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CORE)
      /* cache: 'reload' — לא לקחת גרסה ישנה ממטמון ה־HTTP */
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.indexOf('kalos-') === 0 && k.indexOf(VERSION + '-') !== 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(name, max) {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

function swr(req, cacheName, cap) {
  return caches.open(cacheName).then((c) => c.match(req, { ignoreSearch: cacheName === CORE }).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        c.put(req, res.clone());
        if (cap) trim(cacheName, cap);
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NEVER_CACHE.test(url.hostname)) return;

  /* ניווט: רשת קודם, נפילה ל־index.html השמור */
  if (req.mode === 'navigate' && url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CORE).then((c) => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html', { ignoreSearch: true }).then((r) => r || caches.match('./')))
    );
    return;
  }
  if (url.origin === location.origin) { e.respondWith(swr(req, CORE)); return; }
  if (RUNTIME_HOSTS.indexOf(url.hostname) > -1) { e.respondWith(swr(req, RUNTIME, RUNTIME_MAX)); }
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
