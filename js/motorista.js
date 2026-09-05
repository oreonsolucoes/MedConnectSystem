/* ===================================================================
   MedConnect · App do Motorista
   - Login por PIN com fallback offline (localStorage)
   - Firestore com persistência offline (enableIndexedDbPersistence)
   - Checklist separado por fase: ENTREGA e RETIRADA independentes
     Entrega concluída → card mostra botão de Retirada separado
     Retirada concluída → card mostra ambos concluídos
   =================================================================== */
import { USE_FIREBASE, db } from "./modules/../firebase-config.js";
import { Store } from "./modules/store.js";
import { checklistTemplates, checklistGenerico } from "./modules/mock-data.js";
import {
  reconciliar, marcarTodasLidas, limparResolvidas, confirmarNotificacao, getFeed
} from "./modules/notificacoes.js";
import { enviarVarios, enviarEmBackground, previewURL, driveThumbURL, MODO_SIMULADO } from "./modules/drive-upload.js";
import { registrarFCM, removerFCM } from "./modules/fcm.js";

const $  = (s,c=document)=> c.querySelector(s);
const $$ = (s,c=document)=> [...c.querySelectorAll(s)];

/* Cache local de motoristas para login offline */
const CACHE_KEY = "mc_motoristas_cache";

let motorista = null;
let filtro = "hoje";
let dataEscolhida = "";
let entregas = [];
let unsub = null;

/* ---- Datas ---- */
const hojeISO  = ()=> new Date().toISOString().slice(0,10);
const addDias  = (iso,n)=>{ const d=new Date(iso+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const fmt      = iso=>{ if(!iso) return "—"; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const diaSem   = iso=>{ const d=new Date(iso+"T12:00:00"); return ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][d.getDay()]; };
function inicioSemana(iso){ const d=new Date(iso+"T12:00:00"); const dow=(d.getDay()+6)%7; return addDias(iso,-dow); }
function toast(msg,cls=""){ const t=$("#toast"); t.textContent=msg; t.className="toast "+cls; t.classList.remove("hidden"); setTimeout(()=>t.classList.add("hidden"),2400); }

/* =================================================================
   LOGIN POR PIN
   Fluxo:
   1. Tenta buscar no Firestore (online)
   2. Se offline, busca no cache localStorage (já logou antes com internet)
   3. Salva/atualiza cache sempre que busca com sucesso online
   ================================================================= */
let pinAtual = "";

function setupPin(){
  const disp = $("#pin-display");
  const render = ()=> $$(".pin-dot",disp).forEach((d,i)=> d.classList.toggle("filled",i<pinAtual.length));
  $("#pin-pad").addEventListener("click", e=>{
    const k = e.target.dataset.k; if(!k) return;
    if(k==="back")        pinAtual = pinAtual.slice(0,-1);
    else if(k==="clear")  pinAtual = "";
    else if(pinAtual.length<4) pinAtual += k;
    render();
    $("#pin-error").textContent = "";
    if(pinAtual.length===4) setTimeout(tentarLogin, 150);
  });
}

async function tentarLogin(){
  $$(".pin-dot").forEach(d=>{ d.style.background="var(--accent)"; });
  try {
    let m = null;

    if(USE_FIREBASE){
      const online = navigator.onLine;

      if(online){
        /* --- ONLINE: busca no Firestore e atualiza cache --- */
        const { collection, query, where, getDocs } = await import(
          "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const q    = query(collection(db,"motoristas"), where("pin","==",pinAtual));
        const snap = await getDocs(q);
        if(!snap.empty){
          m = { id: snap.docs[0].id, ...snap.docs[0].data() };
          /* Salva/atualiza cache local — PIN → motorista */
          try {
            const cache = JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
            cache[pinAtual] = m;
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
          } catch {}
        }
      } else {
        /* --- OFFLINE: busca no cache local --- */
        try {
          const cache = JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
          m = cache[pinAtual] || null;
        } catch {}

        if(m){
          toast("Modo offline — dados da última sessão","");
        } else {
          $("#pin-error").textContent = "Sem conexão e PIN não encontrado localmente. Conecte-se ao menos uma vez.";
          pinAtual = ""; $$(".pin-dot").forEach(d=>{ d.style.background=""; d.classList.remove("filled"); });
          return;
        }
      }
    } else {
      /* Demo local */
      const { motoristas } = await import("./modules/mock-data.js");
      m = motoristas.find(x=> x.pin===pinAtual);
    }

    if(!m){
      $("#pin-error").textContent = "Código inválido. Tente novamente.";
      pinAtual = ""; $$(".pin-dot").forEach(d=>{ d.style.background=""; d.classList.remove("filled"); });
      return;
    }
    entrar(m);
  } catch(e){
    console.error(e);
    /* Fallback final: se deu erro de rede, tenta o cache mesmo assim */
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY)||"{}");
      const m = cache[pinAtual];
      if(m){ entrar(m); toast("Modo offline — usando dados em cache",""); return; }
    } catch {}
    $("#pin-error").textContent = "Erro ao verificar PIN. Verifique sua conexão.";
    pinAtual = ""; $$(".pin-dot").forEach(d=>{ d.style.background=""; d.classList.remove("filled"); });
  }
}

function entrar(m){
  motorista = m;
  sessionStorage.setItem("mc_mot", JSON.stringify(m));
  $("#pin-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#mot-nome").textContent = m.nome;
  iniciarEscuta();
  // Registra notificações push FCM (silencioso se não configurado)
  if(USE_FIREBASE && m.id) registrarFCM(m.id, db);
}

function sair(){
  if(USE_FIREBASE && motorista?.id) removerFCM(motorista.id, db);
  motorista = null; sessionStorage.removeItem("mc_mot");
  if(unsub) unsub();
  $("#app").classList.add("hidden");
  $("#pin-screen").classList.remove("hidden");
  pinAtual=""; $$(".pin-dot").forEach(d=>{ d.style.background=""; d.classList.remove("filled"); });
}

/* =================================================================
   ESCUTA EM TEMPO REAL + NOTIFICAÇÕES
   Com persistência do Firestore, onSnapshot serve do cache offline
   ================================================================= */
function iniciarEscuta(){
  if(unsub) unsub();
  unsub = Store.watch("locacoes", lista=>{
    entregas = lista.filter(l =>
      (l.motorista||"").toLowerCase() === motorista.nome.toLowerCase());
    reconciliar(motorista.nome, entregas);
    limparResolvidas(motorista.nome, entregas);
    atualizarSino();
    renderRotas();
    if(!$("#drawer").classList.contains("hidden")) renderDrawer();
  });
}

function atualizarSino(){
  const naoLidas = getFeed(motorista.nome).filter(n=>!n.lida).length;
  const c = $("#sino-contador");
  if(naoLidas>0){ c.textContent=naoLidas>9?"9+":naoLidas; c.classList.remove("hidden"); }
  else c.classList.add("hidden");
}

/* =================================================================
   FILTROS + LISTA DE ROTAS
   ================================================================= */
function aplicarFiltro(lista){
  const hoje = hojeISO();
  switch(filtro){
    case "hoje":      return lista.filter(l=> l.data===hoje);
    case "amanha":    return lista.filter(l=> l.data===addDias(hoje,1));
    case "semana":    { const ini=inicioSemana(hoje); const fim=addDias(ini,6);
                        return lista.filter(l=> l.data>=ini && l.data<=fim); }
    case "pendentes": return lista.filter(l=> !l.checklistEntregaOk || !l.checklistRetiradaOk);
    case "data":      return dataEscolhida ? lista.filter(l=> l.data===dataEscolhida) : lista;
    default:          return lista;
  }
}

function renderRotas(){
  const lista = aplicarFiltro(entregas).sort((a,b)=>
    (a.data+(a.horario||"")).localeCompare(b.data+(b.horario||"")));
  const cont = $("#rotas");
  if(!lista.length){
    cont.innerHTML=`<div class="vazio"><div class="big">🚚</div>
      <div style="font-weight:700;font-size:17px;color:#334155">Nenhuma entrega aqui</div>
      <div style="margin-top:6px">Tente outro filtro acima.</div></div>`;
    return;
  }
  const grupos = {};
  lista.forEach(l=> (grupos[l.data]||=[]).push(l));
  cont.innerHTML = Object.entries(grupos).map(([data,itens])=>`
    <div class="grupo-dia">${diaSem(data)} · ${fmt(data)}</div>
    ${itens.map(l=>cardHTML(l)).join("")}`).join("");

  $$("[data-entrega]").forEach(b=> b.onclick=()=> abrirChecklist(entregas.find(x=>x.id===b.dataset.entrega), "entrega"));
  $$("[data-retirada]").forEach(b=> b.onclick=()=> abrirChecklist(entregas.find(x=>x.id===b.dataset.retirada), "retirada"));
  $$("[data-ver]").forEach(b=> b.onclick=()=> verMaisDetalhes(entregas.find(x=>x.id===b.dataset.ver)));
  $$("[data-maps]").forEach(b=> b.onclick=()=>
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.dataset.maps)}`,"_blank"));
  $$("[data-waze]").forEach(b=> b.onclick=()=>
    window.open(`https://waze.com/ul?q=${encodeURIComponent(b.dataset.waze)}&navigate=yes`,"_blank"));
}

function cardHTML(l){
  const subloc = l.frota==="sublocado";
  const end    = l.endereco||"Endereço no cadastro do cliente";
  const valor  = Number(l.motoristaCusto)||0;
  const entOk  = !!l.checklistEntregaOk;
  const retOk  = !!l.checklistRetiradaOk;
  const tudoOk = entOk && retOk;

  /* Status visual */
  let statusTag = "";
  if(tudoOk)      statusTag = `<span class="status-tag ok">✓ Concluída</span>`;
  else if(entOk)  statusTag = `<span class="status-tag" style="background:#e8f1fa;color:var(--brand)">📦 Entregue · Retirada pendente</span>`;
  else            statusTag = `<span class="status-tag pend">Pendente</span>`;

  /* Botões de ação de checklist */
  let btnsChecklist = "";
  if(!entOk){
    btnsChecklist = `<button data-entrega="${l.id}">📦 Check-list Entrega</button>`;
  } else if(!retOk){
    btnsChecklist = `
      <button style="color:var(--ok);font-size:13px;flex:0.8" data-entrega="${l.id}">✓ Ver Entrega</button>
      <button data-retirada="${l.id}">🔙 Check-list Retirada</button>`;
  } else {
    btnsChecklist = `
      <button style="color:var(--ok);font-size:13px" data-entrega="${l.id}">✓ Ver Entrega</button>
      <button style="color:var(--ok);font-size:13px" data-retirada="${l.id}">✓ Ver Retirada</button>`;
  }

  return `
  <div class="card ${tudoOk?"feito":entOk?"feito":""}" style="${entOk&&!retOk?"border-left-color:var(--accent)":""}">
    <div class="card-topo">
      ${statusTag}
      <div class="card-cli">${esc(l.cliente)}</div>
      <span class="card-tec ${subloc?"subloc":""}">${esc(l.tecnologia)}${subloc?" · Sublocado":""}</span>
      <div class="card-info">
        <div class="linha"><span class="ic">🕒</span><span class="txt"><b>Horário</b>${esc(l.horario||"A combinar")}${l.periodo?` · ${esc(l.periodo)}`:""}</span></div>
        <div class="linha"><span class="ic">📍</span><span class="txt"><b>Local</b>${esc(end)}</span></div>
        ${l.responsavel?`<div class="linha"><span class="ic">👤</span><span class="txt"><b>Responsável</b>${esc(l.responsavel)}</span></div>`:""}
        <div class="linha valor-linha"><span class="ic">💵</span><span class="txt"><b>Você recebe</b><span class="valor-motorista">${valor?brl(valor):"A combinar"}</span></span></div>
      </div>
    </div>
    <div class="card-acoes">
      <button class="waze" data-waze="${esc(end)}">🧭 Waze</button>
      <button class="maps" data-maps="${esc(end)}">🗺️ Maps</button>
      <button class="btn-ver-mais" data-ver="${l.id}" style="background:#f0f7ff;color:var(--brand);border:1.5px solid var(--brand);border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer">🔍 Ver mais</button>
      ${btnsChecklist}
    </div>
  </div>`;
}
/* =================================================================
   VER MAIS DETALHES DA LOCAÇÃO
   Abre painel com dados da clínica buscados no cadastro do cliente
   ================================================================= */
async function verMaisDetalhes(loc){
  if(!loc) return;

  // Busca dados completos do cliente no Firestore para pegar campos extras
  let cli = null;
  try {
    const lista = await Store.list("clientes");
    cli = lista.find(c=>
      c.id === loc.clienteId ||
      (c.nome||"").toLowerCase() === (loc.cliente||"").toLowerCase()
    );
  } catch(e){}

  const s  = (v,fb="Não informado")=> v && v.trim() ? esc(v) : `<span style="color:#94a3b8">${fb}</span>`;
  const end = loc.endereco || cli?.endComercial || cli?.endResidencial || "";

  const html = `
    <div style="position:fixed;inset:0;background:rgba(15,23,42,.7);z-index:500;display:flex;align-items:flex-end;justify-content:center" id="ver-mais-overlay">
      <div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:600px;max-height:90vh;overflow-y:auto;padding:24px 20px 40px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
          <div>
            <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.05em">Detalhes da locação</div>
            <div style="font-size:20px;font-weight:800;color:#12243f;margin-top:2px">${esc(loc.cliente)}</div>
          </div>
          <button id="ver-mais-fechar" style="background:#f1f5f9;border:none;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer">×</button>
        </div>

        <div style="display:grid;gap:12px">
          ${item("🏥","Nome da clínica", s(loc.cliente))}
          ${item("📍","Endereço comercial", s(end))}
          ${item("⚡","Voltagem", s(cli?.voltagem))}
          ${item("🚧","Restrições de acesso", s(cli?.restricoes))}
          ${item("📌","Ponto de referência", s(cli?.pontoReferencia))}
          ${item("👤","Responsável da clínica", s(cli?.responsavelClinica))}
          ${item("🕐","Horário de funcionamento", s(cli?.horario))}
          ${item("📐","Espaço para mesa do equipamento?", s(cli?.espaco))}
          ${cli?.telefone ? item("📞","Telefone", `<a href="tel:${esc(cli.telefone)}" style="color:var(--brand)">${esc(cli.telefone)}</a>`) : ""}
        </div>

        ${end ? `
        <div style="display:flex;gap:10px;margin-top:20px">
          <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}','_blank')"
            style="flex:1;background:#0d4f8b;color:#fff;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
            🗺️ Abrir no Maps
          </button>
          <button onclick="window.open('https://waze.com/ul?q=${encodeURIComponent(end)}&navigate=yes','_blank')"
            style="flex:1;background:#33ccff;color:#12243f;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">
            🧭 Abrir no Waze
          </button>
        </div>` : ""}
      </div>
    </div>`;

  document.body.insertAdjacentHTML("beforeend", html);
  document.getElementById("ver-mais-fechar").onclick = ()=> document.getElementById("ver-mais-overlay").remove();
  document.getElementById("ver-mais-overlay").onclick = e=>{
    if(e.target.id==="ver-mais-overlay") e.target.remove();
  };
}

function item(ic, label, valor){
  return `<div style="background:#f8fafc;border-radius:10px;padding:12px 14px;display:flex;gap:12px;align-items:flex-start">
    <span style="font-size:20px;flex-shrink:0">${ic}</span>
    <div>
      <div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${label}</div>
      <div style="font-size:14px;font-weight:600;color:#12243f">${valor}</div>
    </div>
  </div>`;
}

function brl(v){ return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }

/* =================================================================
   DRAWER DE NOTIFICAÇÕES
   ================================================================= */
function abrirDrawer(){
  $("#drawer-bg").classList.remove("hidden");
  $("#drawer").classList.remove("hidden");
  renderDrawer();
  marcarTodasLidas(motorista.nome);
  atualizarSino();
}
function fecharDrawer(){
  $("#drawer-bg").classList.add("hidden");
  $("#drawer").classList.add("hidden");
}
function renderDrawer(){
  const feed  = getFeed(motorista.nome);
  const lista = $("#drawer-lista");
  if(!feed.length){
    lista.innerHTML=`<div class="vazio"><div class="big">🔔</div>
      <div style="font-weight:700;color:#334155">Sem novidades</div></div>`;
    return;
  }
  const tag={nova:"Nova",alterada:"Alterada",removida:"Removida"};
  lista.innerHTML = feed.map(n=>{
    const loc = entregas.find(x=>x.id===n.locId);
    const resolvida = (!loc||(loc.checklistEntregaOk&&loc.checklistRetiradaOk));
    const precisaConfirmar = resolvida && !n.confirmada;
    return `<div class="notif ${n.tipo} ${n.lida?"":"nao-lida"}">
      <div class="notif-top">
        <span class="notif-tag">${tag[n.tipo]||"Info"}</span>
        <span class="notif-quando">${quando(n.quando)}</span>
      </div>
      <div class="notif-txt">${esc(n.texto)}</div>
      ${precisaConfirmar
        ?`<button class="notif-ok" data-confirmar="${n.id}">✓ Ok, entendi (remover)</button>`
        :`<div class="notif-badge-resolv">${resolvida?"Aguardando confirmação...":"Entrega ativa na sua rota"}</div>`}
    </div>`;
  }).join("");
  $$("[data-confirmar]").forEach(b=> b.onclick=()=>{
    confirmarNotificacao(motorista.nome, b.dataset.confirmar);
    limparResolvidas(motorista.nome, entregas);
    renderDrawer(); atualizarSino();
    toast("Notificação removida","ok");
  });
}
function quando(iso){
  const d=new Date(iso),ag=new Date();
  const dia=d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
  const hora=d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  return d.toDateString()===ag.toDateString()?`Hoje ${hora}`:`${dia} ${hora}`;
}

/* =================================================================
   CHECKLIST — ENTREGA E RETIRADA SEPARADOS
   Cada fase tem seu próprio conjunto de itens, assinatura e mídias.
   Salvar entrega NÃO marca a locação como concluída.
   Salvar retirada marca como concluída (ambas feitas).
   ================================================================= */
let midiaSelecionada = [];
let faseAtual = "entrega";

function abrirChecklist(loc, fase){
  faseAtual = fase;
  midiaSelecionada = [];

  const template = checklistTemplates[loc.tecnologia]||checklistGenerico;

  /* Dados salvos da fase atual */
  const chaveBase = fase === "entrega" ? "checklistEntrega" : "checklistRetirada";
  const salvos = loc[chaveBase] || {};
  const jaConcluida = fase === "entrega" ? !!loc.checklistEntregaOk : !!loc.checklistRetiradaOk;

  const secoesHTML = Object.entries(template).map(([sec,itens])=>`
    <div class="sec"><h4>${esc(sec)}</h4>
    ${itens.map((it,i)=>{
      const id=`ck-${sec.replace(/\W/g,"")}-${i}`;
      const checked = salvos[sec]?.includes(it) ? "checked" : "";
      /* Se já concluída, só visualização */
      const disabled = jaConcluida ? "disabled" : "";
      const opacity  = jaConcluida && !checked ? "opacity:.4" : "";
      return `<div class="item">
        <input type="checkbox" id="${id}" data-sec="${esc(sec)}" data-item="${esc(it)}" ${checked} ${disabled} style="${opacity}">
        <label for="${id}" style="${opacity}">${esc(it)}</label></div>`;
    }).join("")}</div>`).join("");

  const tituloFase = fase === "entrega" ? "📦 Check-list de Entrega" : "🔙 Check-list de Retirada";
  const corFase    = fase === "entrega" ? "var(--brand)" : "var(--ok)";

  $("#checklist-tela").innerHTML=`
    <div class="tela-topo" style="background:${fase==="retirada"?"#0a3a66":"var(--brand-navy)"}">
      <button id="ck-voltar">←</button>
      <div class="tt">
        <strong>${esc(loc.cliente)}</strong>
        <small>${tituloFase} · ${fmt(loc.data)} · ${esc(loc.horario||"")}</small>
      </div>
      ${jaConcluida?`<span style="background:rgba(255,255,255,.2);color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">✓ Concluído</span>`:""}
    </div>
    <div class="tela-corpo">
      ${jaConcluida?`<div style="background:#e2f5ec;color:var(--ok);padding:12px 16px;border-radius:10px;margin-bottom:16px;font-weight:600;font-size:14px">
        ✓ Este check-list já foi concluído. Visualização somente leitura.</div>`:""}

      ${secoesHTML}

      <div class="midia-area">
        <h4>📸 Fotos e vídeos — ${fase}</h4>
        ${!jaConcluida?`
        <div class="midia-botoes">
          <button class="btn btn-ghost" id="btn-camera"><span class="ic">📷</span>Tirar foto</button>
          <button class="btn btn-ghost" id="btn-galeria"><span class="ic">🖼️</span>Galeria</button>
          <button class="btn btn-ghost" id="btn-video"><span class="ic">🎥</span>Vídeo</button>
        </div>
        <input type="file" id="in-camera"  accept="image/*" capture="environment" hidden>
        <input type="file" id="in-galeria" accept="image/*,video/*" multiple hidden>
        <input type="file" id="in-video"   accept="video/*" capture="environment" hidden>`:""}
        <div class="midia-grid" id="midia-grid"></div>
        <div class="midia-status" id="midia-status"></div>
        ${MODO_SIMULADO&&!jaConcluida?`<div class="simulado-aviso">⚙️ Modo demonstração: configure o Apps Script para upload real.</div>`:""}
      </div>

      ${!jaConcluida?`
      <div class="assinatura-area">
        <h4>✍️ Assinatura do cliente</h4>
        <canvas id="ass-pad" class="assinatura-pad"></canvas>
        <button class="btn btn-ghost assinatura-limpar" id="ass-limpar">Limpar assinatura</button>
      </div>`
      : salvos._assinatura
        ? `<div class="assinatura-area"><h4>✍️ Assinatura do cliente</h4>
           <img src="${salvos._assinatura}" style="max-width:100%;border:1px solid var(--line);border-radius:10px"></div>`
        : ""}
    </div>

    ${!jaConcluida?`
    <div class="rodape-fixo">
      <button class="btn btn-ok btn-block btn-lg" id="ck-salvar">
        ${fase==="entrega"?"✓ Confirmar Entrega":"✓ Confirmar Retirada"}
      </button>
    </div>`:""}`;

  $("#checklist-tela").classList.remove("hidden");

  if(!jaConcluida){
    /* Mídias já salvas desta fase */
    const midiasSalvas = salvos._midia || [];
    midiasSalvas.forEach(m => {
      midiaSelecionada.push({file:null, url:m.url, tipo:m.tipo||"foto", enviado:true});
    });
    renderMidia();

    $("#btn-camera").onclick  = ()=> $("#in-camera").click();
    $("#btn-galeria").onclick = ()=> $("#in-galeria").click();
    $("#btn-video").onclick   = ()=> $("#in-video").click();
    ["in-camera","in-galeria","in-video"].forEach(id=>{
      const el = $("#"+id); if(el) el.onchange = e=> adicionarMidia(e.target.files);
    });
    iniciarAssinatura();
    $("#ck-salvar").onclick = ()=> salvarChecklist(loc, fase);
  } else {
    /* Visualização: mostra mídias salvas */
    const midiasSalvas = salvos._midia || [];
    if(midiasSalvas.length){
      const g = $("#midia-grid");
      g.innerHTML = midiasSalvas.map(m=>`
        <a href="${esc(m.url||"#")}" target="_blank" rel="noopener" class="thumb" style="text-decoration:none">
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--brand);text-align:center;padding:4px">
            ${m.tipo==="video"?"🎬":"📷"}<br>${esc(m.nome||"arquivo")}
          </div>
        </a>`).join("");
    }
  }

  $("#ck-voltar").onclick = fecharChecklist;
}

function fecharChecklist(){
  $("#checklist-tela").classList.add("hidden");
  $("#checklist-tela").innerHTML="";
  midiaSelecionada.forEach(m=> m.url && !m.enviado && URL.revokeObjectURL(m.url));
  midiaSelecionada=[];
}

function adicionarMidia(files){
  [...files].forEach(f=> midiaSelecionada.push({file:f,url:previewURL(f),tipo:f.type.startsWith("video")?"video":"foto",enviado:false}));
  renderMidia();
}

function renderMidia(){
  const g=$("#midia-grid");
  if(!g) return;
  g.innerHTML=midiaSelecionada.map((m,i)=>`
    <div class="thumb">
      ${m.tipo==="video"?`<video src="${m.url}" muted></video><span class="vid-ic">🎬</span>`:`<img src="${m.url}">`}
      ${!m.enviado?`<button class="rm" data-rm="${i}">×</button>`:""}
      ${m.enviado?`<div class="up">✓ enviado</div>`:""}
    </div>`).join("");
  $$("[data-rm]").forEach(b=> b.onclick=()=>{
    const i=+b.dataset.rm; URL.revokeObjectURL(midiaSelecionada[i].url);
    midiaSelecionada.splice(i,1); renderMidia();
  });
  const st = $("#midia-status");
  if(st) st.textContent=midiaSelecionada.filter(m=>!m.enviado).length
    ?`${midiaSelecionada.filter(m=>!m.enviado).length} novo(s) arquivo(s) selecionado(s)`:"";
}

let cv,cx,desenhando=false,temAss=false;
function iniciarAssinatura(){
  cv=$("#ass-pad"); if(!cv) return;
  const r=cv.getBoundingClientRect();
  cv.width=r.width; cv.height=170; cx=cv.getContext("2d");
  cx.lineWidth=2.4; cx.lineCap="round"; cx.strokeStyle="#12243f"; temAss=false;
  const pos=e=>{ const b=cv.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:p.clientX-b.left,y:p.clientY-b.top}; };
  const start=e=>{ desenhando=true; const {x,y}=pos(e); cx.beginPath(); cx.moveTo(x,y); e.preventDefault(); };
  const move=e=>{ if(!desenhando)return; const {x,y}=pos(e); cx.lineTo(x,y); cx.stroke(); temAss=true; e.preventDefault(); };
  const end=()=> desenhando=false;
  cv.addEventListener("mousedown",start); cv.addEventListener("mousemove",move); window.addEventListener("mouseup",end);
  cv.addEventListener("touchstart",start,{passive:false}); cv.addEventListener("touchmove",move,{passive:false}); cv.addEventListener("touchend",end);
  const btnLimpar = $("#ass-limpar");
  if(btnLimpar) btnLimpar.onclick=()=>{ cx.clearRect(0,0,cv.width,cv.height); temAss=false; };
}

async function salvarChecklist(loc, fase){
  const btn = $("#ck-salvar");
  btn.disabled = true;

  /* ── Barra de progresso no botão ── */
  function btnProgress(pct, label){
    btn.innerHTML = `
      <span style="display:block;font-size:13px;margin-bottom:5px">${label}</span>
      <div style="background:rgba(255,255,255,.3);border-radius:4px;height:7px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:#fff;border-radius:4px;transition:width .25s"></div>
      </div>
      <span style="font-size:11px;opacity:.85">${pct}%</span>`;
  }

  btnProgress(5, fase==="entrega" ? "Salvando entrega..." : "Salvando retirada...");

  /* ── Monta itens marcados ── */
  const resultado = {};
  $$("#checklist-tela .item input:checked").forEach(cb=>{
    (resultado[cb.dataset.sec]||=[]).push(cb.dataset.item);
  });
  resultado._assinatura = temAss && cv ? cv.toDataURL("image/png") : "";
  resultado._quando     = new Date().toISOString();

  /* URLs já salvas anteriormente (edição / segunda tentativa) */
  resultado._midia = (loc[fase==="entrega"?"checklistEntrega":"checklistRetirada"]?._midia) || [];

  /* ── Salva no Firestore IMEDIATAMENTE (sem esperar upload) ── */
  const update = {};
  if(fase === "entrega"){
    update.checklistEntrega   = resultado;
    update.checklistEntregaOk = true;
    if(!loc.checklistRetiradaOk) update.checklistRetiradaOk = false;
  } else {
    update.checklistRetirada   = resultado;
    update.checklistRetiradaOk = true;
    update.checklistOk         = true;
  }

  btnProgress(30, "Registrando no servidor...");

  try {
    await Store.update("locacoes", loc.id, update);
  } catch(e){
    toast("Salvo localmente — sincronizará quando conectar","");
    console.warn("Salvo offline:", e);
  }

  btnProgress(60, "Checklist salvo! Enviando arquivos...");

  /* ── Fechar tela AGORA — upload continua em background ── */
  const pendentes = midiaSelecionada.filter(m => !m.enviado && m.file);
  const locSnap   = { id:loc.id, cliente:loc.cliente, data:loc.data };

  // Libera o motorista imediatamente
  setTimeout(()=>{
    btn.disabled = false;
    btn.innerHTML = fase==="entrega" ? "✓ Confirmar Entrega" : "✓ Confirmar Retirada";
    fecharChecklist();
    toast(fase==="entrega" ? "✓ Entrega confirmada!" : "✓ Retirada confirmada!", "ok");
  }, 400);

  /* ── Upload em segundo plano com banner no topo ── */
  if(pendentes.length){
    enviarEmBackground(
      pendentes.map(m => m.file),
      { locId:locSnap.id, cliente:locSnap.cliente, data:locSnap.data, fase },
      async (resultados) => {
        /* Quando upload concluir, atualiza _midia no Firestore */
        const novasUrls = resultados
          .filter(r => r.ok)
          .map((r, idx) => ({
            url:     r.url,
            driveId: r.driveId || null,
            nome:    r.nome,
            tipo:    pendentes[idx]?.file?.type?.startsWith("video") ? "video" : "foto",
            fase,
            simulado: !!r.simulado
          }));

        if(novasUrls.length){
          try {
            /* Re-lê o doc para não sobrescrever dados salvos depois */
            const chave = fase==="entrega" ? "checklistEntrega" : "checklistRetirada";
            const todos = await Store.list("locacoes");
            const locAtual = todos.find(x => x.id === locSnap.id);
            const midiasExistentes = locAtual?.[chave]?._midia || [];
            const updateMidia = {};
            updateMidia[chave] = {
              ...(locAtual?.[chave] || {}),
              _midia: [...midiasExistentes, ...novasUrls]
            };
            await Store.update("locacoes", locSnap.id, updateMidia);
          } catch(e){
            console.warn("Não foi possível atualizar mídias no Firestore:", e);
          }
        }
      }
    );
  }
}

function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ==================== BOOT ==================== */
setupPin();
$("#btn-sino").onclick   = abrirDrawer;
$("#drawer-close").onclick = fecharDrawer;
$("#drawer-bg").onclick  = fecharDrawer;
$("#btn-sair").onclick   = sair;

$("#filtros").addEventListener("click", e=>{
  const c=e.target.closest(".chip"); if(!c) return;
  filtro=c.dataset.f;
  $$(".chip").forEach(x=>x.classList.toggle("active",x===c));
  $("#filtro-data-row").classList.toggle("hidden",filtro!=="data");
  renderRotas();
});
$("#filtro-data").onchange = e=>{ dataEscolhida=e.target.value; renderRotas(); };

const salvo = sessionStorage.getItem("mc_mot");
if(salvo) entrar(JSON.parse(salvo));
