/* ===================================================================
   MedConnect · Service Worker v6
   - Cache offline (arquivos estáticos)
   - Push FCM → notificação nativa Android (funciona com app fechado)
   - Background Sync → retoma uploads pendentes quando conexão volta
   =================================================================== */

const CACHE_VERSION = "mc-v6";
const CACHE_NAME    = `medconnect-${CACHE_VERSION}`;

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
  "./js/modules/levantamento.js",
  "./js/modules/responsaveis.js",
  "./js/modules/relatorio.js",
  "./js/modules/notificacoes.js",
  "./js/modules/drive-upload.js",
  "./js/modules/fcm.js",
  "./js/modules/tour.js",
  "./assets/logo.png",
  "./assets/logo-branco.png",
  "./assets/logo-icon.png"
];

/* ==================== INSTALAÇÃO ==================== */
self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=> cache.addAll(STATIC_FILES))
      .then(()=> self.skipWaiting())
  );
});

/* ==================== ATIVAÇÃO ==================== */
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

/* ==================== FETCH ==================== */
self.addEventListener("fetch", e=>{
  const url = new URL(e.request.url);

  if(url.hostname.includes("firebase")   ||
     url.hostname.includes("gstatic")    ||
     url.hostname.includes("googleapis") ||
     url.hostname.includes("viacep")     ||
     url.hostname.includes("script.google")){
    e.respondWith(
      fetch(e.request).catch(()=> new Response(
        JSON.stringify({ok:false,erro:"offline"}),
        {headers:{"Content-Type":"application/json"}}
      ))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(response=>{
        if(response && response.status===200 && response.type==="basic"){
          caches.open(CACHE_NAME).then(c=>c.put(e.request, response.clone()));
        }
        return response;
      }).catch(()=>{
        if(e.request.headers.get("accept")?.includes("text/html"))
          return caches.match("./motorista.html");
      });
    })
  );
});

/* ==================== PUSH — notificação nativa ==================== */
/*
  Payload esperado do FCM (via Cloud Function):
  {
    "titulo": "Nova entrega — Dra. Priscila",
    "corpo":  "Qclean · 07/09 · 09h às 18h",
    "tipo":   "nova_entrega" | "entrega_alterada" | "upload_ok" | "upload_erro",
    "url":    "/MedConnectSystem/motorista.html"
  }
*/
self.addEventListener("push", e=>{
  if(!e.data) return;
  let data;
  try { data = e.data.json(); } catch { data = { titulo:"MedConnect", corpo: e.data.text() }; }

  const opcoes = {
    body:    data.corpo  || "",
    icon:    "./assets/logo-icon.png",
    badge:   "./assets/logo-icon.png",
    vibrate: [200, 100, 200],
    tag:     data.tipo   || "mc-notif",       // agrupa notifs do mesmo tipo
    renotify: true,
    data:    { url: data.url || "./motorista.html" },
    actions: data.tipo === "nova_entrega" || data.tipo === "entrega_alterada"
      ? [{ action:"abrir", title:"Ver entrega" }]
      : []
  };

  e.waitUntil(
    self.registration.showNotification(data.titulo || "MedConnect", opcoes)
  );
});

/* Clique na notificação → abre o app do motorista */
self.addEventListener("notificationclick", e=>{
  e.notification.close();
  const destino = e.notification.data?.url || "./motorista.html";

  e.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(clients=>{
      // Se o app já está aberto, foca nele
      const aberto = clients.find(c=> c.url.includes("motorista"));
      if(aberto) return aberto.focus();
      return self.clients.openWindow(destino);
    })
  );
});

/* ==================== BACKGROUND SYNC — upload pendente ==================== */
/*
  Disparado pelo navegador quando a conexão volta.
  O motorista.js registra a tag "mc-upload" quando enfileira arquivos.
  O SW avisa o cliente (que faz o upload real, pois SW não tem acesso aos File objects).
*/
self.addEventListener("sync", e=>{
  if(e.tag === "mc-upload"){
    e.waitUntil(
      self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(clients=>{
        clients.forEach(c=> c.postMessage({ tipo:"retomar-uploads" }));
      })
    );
  }
  if(e.tag === "mc-sync"){
    e.waitUntil(
      self.clients.matchAll().then(clients=>{
        clients.forEach(c=> c.postMessage({ tipo:"sync-ok" }));
      })
    );
  }
});
