/* D LAP 每日工作表 — 离线也能打开（有网络时一定拿最新版） */
var CACHE = 'dlap-checklist-v1';
var SHELL = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('dlap-checklist-') === 0 && k !== CACHE; })
                           .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* 先拿网络；网络慢（超过 4 秒）或没网络，就用手机里存的 */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var isPage = req.mode === 'navigate';
  var fromCache = function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || (isPage ? caches.match('./') : undefined);
    });
  };
  e.respondWith(new Promise(function (resolve) {
    var settled = false;
    var finish = function (r) { if (!settled && r) { settled = true; resolve(r); } };
    var timer = setTimeout(function () { fromCache().then(finish); }, 4000);
    fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(isPage ? './' : req, copy); });
      }
      clearTimeout(timer);
      finish(res);
    }).catch(function () {
      clearTimeout(timer);
      fromCache().then(function (r) { if (!settled) { settled = true; resolve(r || Response.error()); } });
    });
  }));
});
