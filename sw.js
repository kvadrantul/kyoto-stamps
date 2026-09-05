/* Печати Киото — офлайн-оболочка.
   Страница, значки и файлы выгрузки лежат в кэше целиком; куски карты
   (тайлы) кладутся туда по мере просмотра, чтобы уже виденные районы
   открывались без интернета. Номер версии менять при правке этого файла. */
"use strict";

const V     = "kyoto-2026-09-05";
const SHELL = V + "-shell";
const TILES = V + "-tiles";
const TILE_LIMIT = 1200;          // примерно 40–60 МБ: город целиком на средних приближениях

const LOCAL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./kyoto-stamps.kml",
  "./kyoto-stamps.gpx"
];
const REMOTE = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
];

const isTile = h => h === "tile.openstreetmap.org"
                 || h.endsWith(".tile.openstreetmap.org")
                 || h === "server.arcgisonline.com";
const isFont = h => h === "fonts.googleapis.com" || h === "fonts.gstatic.com";

self.addEventListener("install", ev => {
  ev.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await c.addAll(LOCAL);
    // чужие адреса кладём поодиночке: недоступный CDN не должен рушить установку
    await Promise.all(REMOTE.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", ev => {
  ev.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => !n.startsWith(V)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

async function put(cache, req, res){
  try { (await caches.open(cache)).put(req, res); } catch (e) {}
}

let trimming = false;
async function trim(c){
  if (trimming) return;
  trimming = true;
  try {
    const keys = await c.keys();
    if (keys.length > TILE_LIMIT)
      await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(k => c.delete(k)));
  } catch (e) {} finally { trimming = false; }
}

/* тайлы: сначала кэш — в дороге это и скорость, и работа без сети */
async function tile(req){
  const c = await caches.open(TILES);
  const hit = await c.match(req, {ignoreVary:true});
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok){ c.put(req, res.clone()); trim(c); }
    return res;
  } catch (e) {
    return new Response("", {status:504, statusText:"нет сети"});
  }
}

/* шрифты и библиотеки: сначала кэш, обновление в фоне */
async function stale(req, cache){
  const c = await caches.open(cache);
  const hit = await c.match(req, {ignoreVary:true});
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (isTile(url.hostname)){ ev.respondWith(tile(req)); return; }
  if (isFont(url.hostname)){ ev.respondWith(stale(req, SHELL)); return; }

  /* сама страница: сначала сеть, чтобы правки доезжали сразу; без сети — из кэша */
  if (req.mode === "navigate"){
    ev.respondWith((async () => {
      try {
        const res = await fetch(req);
        put(SHELL, "./index.html", res.clone());
        return res;
      } catch (e) {
        return (await caches.match("./index.html")) || (await caches.match("./")) ||
               new Response("Нет сети и нет сохранённой копии.", {status:503, headers:{"content-type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }

  if (url.origin === self.location.origin || REMOTE.includes(url.href)){
    ev.respondWith(stale(req, SHELL));
  }
});
