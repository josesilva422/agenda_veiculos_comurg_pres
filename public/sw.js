/* Service worker do app instalável.
   Só guarda arquivos estáticos (visual) e uma página de "sem conexão".
   Páginas e dados do sistema NUNCA ficam em cache: contêm informações de pessoas (LGPD) e precisam estar sempre atuais. */
const VERSAO = "v1";
const ESTATICO = `estatico-${VERSAO}`;
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(ESTATICO).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== ESTATICO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // navegação: rede; sem conexão, mostra a página de aviso
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  // arquivos do Next com nome único (hash): cache primeiro
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pwa/icone/")) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone();
              caches.open(ESTATICO).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
  }
});
