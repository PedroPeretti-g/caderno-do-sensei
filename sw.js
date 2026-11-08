/* Guarda os arquivos do app para abrir rápido e funcionar sem sinal.
   - vendor/ e icons/: saem direto do aparelho (se mudar algum, troque o número do CACHE abaixo).
   - o resto (index, app.js, styles): tenta a internet, mas se ela demorar mais de 3 segundos abre a cópia salva,
     então o app não fica travado com sinal fraco. A cópia nova é guardada para a próxima abertura.
   Os dados dos alunos ficam só no banco. */
const CACHE = 'caderno-sensei-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'vendor/supabase.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
const STATIC = /\/(vendor|icons)\//;
const WAIT = 3000;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (r, res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; };
const saved = r => caches.match(r, {ignoreSearch:true}).then(m => m || caches.match('index.html'));
function freshOrSaved(r){
  return new Promise(resolve => {
    let done = false;
    const finish = res => { if (!done && res) { done = true; resolve(res); } };
    const timer = setTimeout(() => { saved(r).then(finish); }, WAIT);
    fetch(r).then(res => { clearTimeout(timer); keep(r, res); finish(res); })
      .catch(() => { clearTimeout(timer); saved(r).then(res => { if (res) finish(res); else resolve(Response.error()); }); });
  });
}
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (STATIC.test(u.pathname)) {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => keep(r, res))));
    return;
  }
  e.respondWith(freshOrSaved(r));
});
