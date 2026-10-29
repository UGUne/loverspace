/* 恋人空间 app 壳缓存 Service Worker
 * 策略:
 *   - 导航(打开 App): 缓存优先秒开, 后台静默拉最新写回缓存(下次启动即新版本)
 *   - 同源静态资源(图标等): 缓存优先
 *   - /api/ 与 /uploads/: 直连不缓存(接口与照片原图必须实时, 且避免缓存膨胀)
 * SHELL_VERSION 由 sync_to_gh.py 按 index.html 内容哈希自动注入, 推送即触发 SW 更新。
 */
const SHELL_VERSION = '5798e09d8a';
const CACHE = 'loverspace-shell-' + SHELL_VERSION;
const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL_ASSETS);
  }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== CACHE) return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // 跨域直连
  if (url.pathname.indexOf('/api/') === 0) return;           // 接口/同步直连
  if (url.pathname.indexOf('/uploads/') === 0) return;        // 照片原图直连(避免缓存膨胀)

  if (req.mode === 'navigate') {
    // 打开 App: 先秒回缓存, 后台拉最新写回缓存
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (cached) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(function () { return cached; });
        return cached || net;
      });
    }));
    return;
  }

  // 同源静态资源: 缓存优先
  e.respondWith(caches.match(req).then(function (cached) {
    if (cached) return cached;
    return fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});
