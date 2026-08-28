/* ===================================================================
   MedConnect · Service Worker (PWA Offline)
   - Cacheia arquivos estáticos do sistema
   - Quando offline: serve do cache
   - Quando online: sincroniza alterações pendentes com o Firestore
   =================================================================== */

const CACHE_VERSION = "mc-v3";
const CACHE_NAME    = `medconnect-${CACHE_VERSION}`;

/* Arquivos que devem funcionar offline */
const STATIC_FILES = [
  "./",
  "./index.html",
  "./motorista.html",
  "./styles.css",
  "./motorista.css",
  "./js/app.js",
  "./js/motorista.js",
  "./js/firebase-config.js",
  "./js/modules/utils.js",
  "./js/modules/store.js",
  "./js/modules/mock-data.js",
  "./js/modules/dashboard.js",
  "./js/modules/cadastros.js",
  "./js/modules/locacoes.js",
  "./js/modules/romaneio.js",
  "./js/modules/financeiro.js",
  "./js/modules/responsaveis.js",
  "./js/modules/relatorio.js",
  "./js/modules/notificacoes.js",
  "./js/modules/drive-upload.js",
  "./js/modules/tour.js",
  "./assets/logo.png",
  "./assets/logo-branco.png",
  "./assets/logo-icon.png"
];

/* ==================== INSTALAÇÃO ==================== */
self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache=>{
      console.log("[SW] Cacheando arquivos estáticos...");
      return cache.addAll(STATIC_FILES);
    }).then(()=> self.skipWaiting())
  );
});

/* ==================== ATIVAÇÃO ==================== */
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k!==CACHE_NAME).map(k=> caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

/* ==================== FETCH ==================== */
self.addEventListener("fetch", e=>{
  const url = new URL(e.request.url);

  // Firebase, CDNs e APIs externas: sempre network-first, sem cache
  if(url.hostname.includes("firebase") ||
     url.hostname.includes("gstatic")  ||
     url.hostname.includes("googleapis") ||
     url.hostname.includes("viacep")   ||
     url.hostname.includes("script.google")){
    e.respondWith(fetch(e.request).catch(()=> new Response(
      JSON.stringify({ok:false,erro:"offline"}),
      {headers:{"Content-Type":"application/json"}}
    )));
    return;
  }

  // Arquivos estáticos: cache-first com fallback para network
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(response=>{
        // Cacheia se for resposta válida
        if(response && response.status===200 && response.type==="basic"){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c=> c.put(e.request, clone));
        }
        return response;
      }).catch(()=> {
        // Fallback: se for página HTML, serve o index.html em cache
        if(e.request.headers.get("accept")?.includes("text/html")){
          return caches.match("./index.html");
        }
      });
    })
  );
});

/* ==================== SYNC (background) ==================== */
/* Quando a conexão volta, o navegador dispara este evento.
   Em modo Firebase real, o Firestore já faz sync automático.
   Aqui apenas notificamos os clientes. */
self.addEventListener("sync", e=>{
  if(e.tag==="mc-sync"){
    e.waitUntil(
      self.clients.matchAll().then(clients=>{
        clients.forEach(c=> c.postMessage({ tipo:"sync-ok" }));
      })
    );
  }
});

/* ==================== PUSH (futuro) ==================== */
self.addEventListener("push", e=>{
  if(!e.data) return;
  const data = e.data.json();
  self.registration.showNotification(data.titulo||"MedConnect", {
    body: data.corpo||"",
    icon: "./assets/logo-icon.png",
    badge:"./assets/logo-icon.png"
  });
});
