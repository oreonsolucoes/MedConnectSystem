/* ===================================================================
   MedConnect · App do Motorista
   PIN via Firestore (produção) ou mock-data (demo local)
   =================================================================== */
import { USE_FIREBASE, db } from "./modules/../firebase-config.js";
import { Store } from "./modules/store.js";
import { checklistTemplates, checklistGenerico } from "./modules/mock-data.js";
import {
  reconciliar, marcarTodasLidas, limparResolvidas, confirmarNotificacao, getFeed
} from "./modules/notificacoes.js";
import { enviarVarios, previewURL, MODO_SIMULADO } from "./modules/drive-upload.js";

const $  = (s,c=document)=> c.querySelector(s);
const $$ = (s,c=document)=> [...c.querySelectorAll(s)];

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
   LOGIN POR PIN — busca no Firestore em produção
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
  // Feedback visual
  $$(".pin-dot").forEach(d=>{ d.style.background="var(--accent)"; });
  try {
    let m = null;
    if(USE_FIREBASE){
      // Busca no Firestore: coleção "motoristas", campo "pin"
      const { collection, query, where, getDocs } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const q   = query(collection(db,"motoristas"), where("pin","==",pinAtual));
      const snap = await getDocs(q);
      if(!snap.empty) m = { id: snap.docs[0].id, ...snap.docs[0].data() };
    } else {
      // Demo local
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
    $("#pin-error").textContent = "Erro ao verificar PIN. Tente novamente.";
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
}

function sair(){
  motorista = null; sessionStorage.removeItem("mc_mot");
  if(unsub) unsub();
  $("#app").classList.add("hidden");
  $("#pin-screen").classList.remove("hidden");
  pinAtual=""; $$(".pin-dot").forEach(d=>{ d.style.background=""; d.classList.remove("filled"); });
}

/* =================================================================
   ESCUTA EM TEMPO REAL + NOTIFICAÇÕES
   ================================================================= */
function iniciarEscuta(){
  if(unsub) unsub();
  unsub = Store.watch("locacoes", lista=>{
    entregas = lista.filter(l =>
      (l.motorista||"").toLowerCase() === motorista.nome.toLowerCase());
    const { unread } = reconciliar(motorista.nome, entregas);
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
    case "pendentes": return lista.filter(l=> !l.checklistOk);
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

  $$("[data-abrir]").forEach(b=> b.onclick=()=> abrirChecklist(entregas.find(x=>x.id===b.dataset.abrir)));
  $$("[data-maps]").forEach(b=> b.onclick=()=>
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.dataset.maps)}`,"_blank"));
  $$("[data-waze]").forEach(b=> b.onclick=()=>
    window.open(`https://waze.com/ul?q=${encodeURIComponent(b.dataset.waze)}&navigate=yes`,"_blank"));
}

function cardHTML(l){
  const subloc = l.frota==="sublocado";
  const end    = l.endereco||"Endereço no cadastro do cliente";
  const valor  = Number(l.motoristaCusto)||0;
  return `
  <div class="card ${l.checklistOk?"feito":""}">
    <div class="card-topo">
      <span class="status-tag ${l.checklistOk?"ok":"pend"}">${l.checklistOk?"✓ Concluída":"Pendente"}</span>
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
      <button data-abrir="${l.id}">📋 ${l.checklistOk?"Revisar":"Check-list"}</button>
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
    const resolvida = (!loc||loc.checklistOk);
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
   CHECKLIST + UPLOAD + ASSINATURA
   ================================================================= */
let midiaSelecionada = [];
let faseAtual = "entrega";

function abrirChecklist(loc){
  faseAtual="entrega"; midiaSelecionada=[];
  const template = checklistTemplates[loc.tecnologia]||checklistGenerico;
  const salvos   = loc.checklist||{};
  const secoesHTML = Object.entries(template).map(([sec,itens])=>`
    <div class="sec"><h4>${esc(sec)}</h4>
    ${itens.map((it,i)=>{
      const id=`ck-${sec.replace(/\W/g,"")}-${i}`;
      const checked=salvos[sec]?.includes(it)?"checked":"";
      return `<div class="item"><input type="checkbox" id="${id}" data-sec="${esc(sec)}" data-item="${esc(it)}" ${checked}><label for="${id}">${esc(it)}</label></div>`;
    }).join("")}</div>`).join("");

  $("#checklist-tela").innerHTML=`
    <div class="tela-topo">
      <button id="ck-voltar">←</button>
      <div class="tt"><strong>${esc(loc.cliente)}</strong>
        <small>${esc(loc.tecnologia)} · ${fmt(loc.data)} · ${esc(loc.horario||"")}</small></div>
    </div>
    <div class="tela-corpo">
      <div class="fase-switch">
        <button class="active" data-fase="entrega">📦 Entrega</button>
        <button data-fase="retirada">🔙 Retirada</button>
      </div>
      ${secoesHTML}
      <div class="midia-area">
        <h4>📸 Fotos e vídeos do equipamento</h4>
        <div class="midia-botoes">
          <button class="btn btn-ghost" id="btn-camera"><span class="ic">📷</span>Tirar foto</button>
          <button class="btn btn-ghost" id="btn-galeria"><span class="ic">🖼️</span>Galeria</button>
          <button class="btn btn-ghost" id="btn-video"><span class="ic">🎥</span>Vídeo</button>
        </div>
        <input type="file" id="in-camera"  accept="image/*" capture="environment" hidden>
        <input type="file" id="in-galeria" accept="image/*,video/*" multiple hidden>
        <input type="file" id="in-video"   accept="video/*" capture="environment" hidden>
        <div class="midia-grid" id="midia-grid"></div>
        <div class="midia-status" id="midia-status"></div>
        ${MODO_SIMULADO?`<div class="simulado-aviso">⚙️ Modo demonstração: configure o Apps Script para upload real.</div>`:""}
      </div>
      <div class="assinatura-area">
        <h4>✍️ Assinatura do cliente</h4>
        <canvas id="ass-pad" class="assinatura-pad"></canvas>
        <button class="btn btn-ghost assinatura-limpar" id="ass-limpar">Limpar assinatura</button>
      </div>
    </div>
    <div class="rodape-fixo">
      <button class="btn btn-ok btn-block btn-lg" id="ck-salvar">✓ Concluir e salvar</button>
    </div>`;

  $("#checklist-tela").classList.remove("hidden");
  $$("[data-fase]").forEach(b=> b.onclick=()=>{
    faseAtual=b.dataset.fase; $$("[data-fase]").forEach(x=>x.classList.toggle("active",x===b));
  });
  $("#btn-camera").onclick  = ()=> $("#in-camera").click();
  $("#btn-galeria").onclick = ()=> $("#in-galeria").click();
  $("#btn-video").onclick   = ()=> $("#in-video").click();
  ["in-camera","in-galeria","in-video"].forEach(id=>
    $("#"+id).onchange = e=> adicionarMidia(e.target.files));
  iniciarAssinatura();
  $("#ck-voltar").onclick = fecharChecklist;
  $("#ck-salvar").onclick = ()=> salvarChecklist(loc);
}

function fecharChecklist(){
  $("#checklist-tela").classList.add("hidden");
  $("#checklist-tela").innerHTML="";
  midiaSelecionada.forEach(m=> m.url && URL.revokeObjectURL(m.url));
  midiaSelecionada=[];
}
function adicionarMidia(files){
  [...files].forEach(f=> midiaSelecionada.push({file:f,url:previewURL(f),tipo:f.type.startsWith("video")?"video":"foto",enviado:false}));
  renderMidia();
}
function renderMidia(){
  const g=$("#midia-grid");
  g.innerHTML=midiaSelecionada.map((m,i)=>`
    <div class="thumb">
      ${m.tipo==="video"?`<video src="${m.url}" muted></video><span class="vid-ic">🎬</span>`:`<img src="${m.url}">`}
      <button class="rm" data-rm="${i}">×</button>
      ${m.enviado?`<div class="up">✓ enviado</div>`:""}
    </div>`).join("");
  $$("[data-rm]").forEach(b=> b.onclick=()=>{
    const i=+b.dataset.rm; URL.revokeObjectURL(midiaSelecionada[i].url);
    midiaSelecionada.splice(i,1); renderMidia();
  });
  $("#midia-status").textContent=midiaSelecionada.length?`${midiaSelecionada.length} arquivo(s) selecionado(s)`:"";
}

let cv,cx,desenhando=false,temAss=false;
function iniciarAssinatura(){
  cv=$("#ass-pad"); const r=cv.getBoundingClientRect();
  cv.width=r.width; cv.height=170; cx=cv.getContext("2d");
  cx.lineWidth=2.4; cx.lineCap="round"; cx.strokeStyle="#12243f"; temAss=false;
  const pos=e=>{ const b=cv.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:p.clientX-b.left,y:p.clientY-b.top}; };
  const start=e=>{ desenhando=true; const {x,y}=pos(e); cx.beginPath(); cx.moveTo(x,y); e.preventDefault(); };
  const move=e=>{ if(!desenhando)return; const {x,y}=pos(e); cx.lineTo(x,y); cx.stroke(); temAss=true; e.preventDefault(); };
  const end=()=> desenhando=false;
  cv.addEventListener("mousedown",start); cv.addEventListener("mousemove",move); window.addEventListener("mouseup",end);
  cv.addEventListener("touchstart",start,{passive:false}); cv.addEventListener("touchmove",move,{passive:false}); cv.addEventListener("touchend",end);
  $("#ass-limpar").onclick=()=>{ cx.clearRect(0,0,cv.width,cv.height); temAss=false; };
}

async function salvarChecklist(loc){
  const btn=$("#ck-salvar"); btn.disabled=true; btn.textContent="Salvando...";
  let midiaUrls=loc.checklist?._midia||[];
  const pendentes=midiaSelecionada.filter(m=>!m.enviado);
  if(pendentes.length){
    const files=pendentes.map(m=>m.file);
    toast(`Enviando ${files.length} arquivo(s)...`);
    const resultados=await enviarVarios(files,{locId:loc.id,cliente:loc.cliente,data:loc.data,fase:faseAtual},
      (i,total)=>{ $("#midia-status").textContent=i<total?`Enviando ${i+1}/${total}...`:"Envio concluído"; });
    resultados.forEach((r,idx)=>{ if(r.ok){ pendentes[idx].enviado=true; midiaUrls.push({url:r.url,nome:r.nome,fase:faseAtual,simulado:!!r.simulado}); }});
    renderMidia();
  }
  const resultado={...(loc.checklist||{})};
  const itens={};
  $$("#checklist-tela .item input:checked").forEach(cb=>{ (itens[cb.dataset.sec]||=[]).push(cb.dataset.item); });
  Object.assign(resultado,itens);
  resultado._fase=faseAtual; resultado._midia=midiaUrls;
  resultado._assinatura=temAss?cv.toDataURL("image/png"):(resultado._assinatura||"");
  resultado._quando=new Date().toISOString();
  await Store.update("locacoes",loc.id,{checklist:resultado,checklistOk:true});
  btn.disabled=false; btn.textContent="✓ Concluir e salvar";
  toast("Check-list concluído! ✓","ok");
  fecharChecklist();
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
