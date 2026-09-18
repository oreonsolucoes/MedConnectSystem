/* ===================================================================
   MedConnect · App principal
   Roteamento SPA · Firebase Authentication · RBAC granular por módulo
   =================================================================== */
import { USE_FIREBASE, auth, db } from "./firebase-config.js";
import { $, $$, toast, closeModal } from "./modules/utils.js";
import { abrirBoasVindas } from "./modules/tour.js";

import * as Dashboard  from "./modules/dashboard.js";
import * as Locacoes   from "./modules/locacoes.js";
import * as Romaneio   from "./modules/romaneio.js";
import * as Financeiro from "./modules/financeiro.js";
import {
  renderClientes, renderMotoristas, renderFornecedores, renderEquipamentos
} from "./modules/cadastros.js";
import { renderResponsaveis } from "./modules/responsaveis.js";
import { renderConvites }     from "./modules/convites.js";

/* ---------------- Ícones SVG Lucide ---------------- */
const ICO = {
  dashboard:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  romaneio:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  locacoes:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clientes:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  equipamentos: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="1"/></svg>`,
  motoristas:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M8.5 14.5A5 5 0 0 0 12 16a5 5 0 0 0 3.5-1.5"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/></svg>`,
  responsaveis: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg>`,
  fornecedores: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  financeiro:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  convites:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.93 3.58 2 2 0 0 1 3.93 1.4h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  usuarios:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`
};

/* ---------------- Rotas + permissões ----------------
   perfis:   quais perfis têm acesso por padrão (admin sempre acessa tudo)
   modulo:   chave usada em currentUser.modulos[] para usuários operacionais
   Usuários com perfil "admin" acessam TUDO.
   Usuários com perfil "operacional" acessam apenas os módulos listados
   no campo modulos[] do seu documento Firestore.
   Usuários com perfil "motorista" acessam apenas romaneio (legado).
   ---------------------------------------------------------------- */
const ROUTES = {
  dashboard:    { titulo:"Dashboard",    ico:ICO.dashboard,    modulo:"dashboard",    soAdmin:true,  render:(v)=>Dashboard.render(v) },
  romaneio:     { titulo:"Romaneio",     ico:ICO.romaneio,     modulo:"romaneio",     soAdmin:false, render:(v,u)=>Romaneio.render(v,u) },
  locacoes:     { titulo:"Locações",     ico:ICO.locacoes,     modulo:"locacoes",     soAdmin:false, render:(v)=>Locacoes.render(v) },
  clientes:     { titulo:"Clientes",     ico:ICO.clientes,     modulo:"clientes",     soAdmin:false, render:(v)=>renderClientes(v) },
  equipamentos: { titulo:"Equipamentos", ico:ICO.equipamentos, modulo:"equipamentos", soAdmin:false, render:(v)=>renderEquipamentos(v) },
  motoristas:   { titulo:"Motoristas",   ico:ICO.motoristas,   modulo:"motoristas",   soAdmin:false, render:(v)=>renderMotoristas(v) },
  responsaveis: { titulo:"Responsáveis", ico:ICO.responsaveis, modulo:"responsaveis", soAdmin:false, render:(v)=>renderResponsaveis(v) },
  fornecedores: { titulo:"Fornecedores", ico:ICO.fornecedores, modulo:"fornecedores", soAdmin:false, render:(v)=>renderFornecedores(v) },
  financeiro:   { titulo:"Financeiro",   ico:ICO.financeiro,   modulo:"financeiro",   soAdmin:false, render:(v)=>Financeiro.render(v) },
  convites:     { titulo:"Convites",     ico:ICO.convites,     modulo:"convites",     soAdmin:false, render:(v)=>renderConvites(v) },
  usuarios:     { titulo:"Usuários",     ico:ICO.usuarios,     modulo:"usuarios",     soAdmin:true,  render:(v)=>import("./modules/usuarios.js").then(m=>m.render(v)) }
};

const NAV_SECTIONS = [
  { label:"Operação",   rotas:["dashboard","romaneio","locacoes"] },
  { label:"Cadastros",  rotas:["clientes","equipamentos","motoristas","responsaveis","fornecedores"] },
  { label:"Gestão",     rotas:["financeiro","convites"] },
  { label:"Administração", rotas:["usuarios"] }
];

let currentUser = null;

/* ---- Verifica se o usuário tem acesso a uma rota ---- */
function temAcesso(rota){
  const def = ROUTES[rota];
  if(!def) return false;
  const perfil = currentUser?.perfil;
  if(perfil === "admin") return true;               // admin: acesso total
  if(def.soAdmin) return false;                     // rota exclusiva admin
  if(perfil === "motorista") return rota === "romaneio"; // motorista: só romaneio
  // perfil "operacional": verifica array de módulos
  const modulos = currentUser?.modulos || [];
  return modulos.includes(def.modulo);
}

/* ============================ AUTH ============================ */
async function login(email, senha){
  $("#login-error").textContent = "";
  $("#btn-login").disabled = true;
  $("#btn-login").textContent = "Entrando...";
  try {
    if(USE_FIREBASE){
      const { signInWithEmailAndPassword } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
      const { doc, getDoc } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);

      const snap = await getDoc(doc(db, "usuarios", cred.user.uid));
      const dados = snap.exists()
        ? snap.data()
        : { nome: cred.user.email.split("@")[0], perfil:"admin" };

      entrar({ id:cred.user.uid, email:cred.user.email, ...dados });
    } else {
      const { usuarios } = await import("./modules/mock-data.js");
      const u = usuarios.find(x =>
        x.email === email.trim().toLowerCase() && x.senha === senha);
      if(!u) throw new Error("invalido");
      entrar(u);
    }
  } catch(e){
    console.error(e);
    $("#login-error").textContent = "E-mail ou senha inválidos.";
  } finally {
    $("#btn-login").disabled = false;
    $("#btn-login").textContent = "Entrar";
  }
}

function entrar(u){
  currentUser = u;
  sessionStorage.setItem("mc_user", JSON.stringify(u));
  $("#login-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  montarInterface();
}

async function logout(){
  if(USE_FIREBASE){
    const { signOut } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    await signOut(auth).catch(()=>{});
  }
  currentUser = null;
  sessionStorage.removeItem("mc_user");
  $("#app-shell").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
  $("#login-email").value = "";
  $("#login-pass").value  = "";
}

/* ==================== INTERFACE / RBAC ==================== */
function montarInterface(){
  const perfil = currentUser.perfil;
  let labelPerfil = "Usuário";
  if(perfil === "admin")       labelPerfil = "Administrador";
  else if(perfil === "motorista") labelPerfil = "Motorista";
  else if(perfil === "operacional") labelPerfil = "Operacional";

  $("#side-name").textContent   = currentUser.nome  || currentUser.email;
  $("#side-role").textContent   = labelPerfil;
  $("#side-avatar").textContent = (currentUser.nome||currentUser.email)[0].toUpperCase();
  $("#top-user").textContent    = currentUser.nome  || currentUser.email;

  const nav = $("#sidebar-nav"); nav.innerHTML = "";
  NAV_SECTIONS.forEach(sec=>{
    const permitidas = sec.rotas.filter(r => temAcesso(r));
    if(!permitidas.length) return;
    const h = document.createElement("div");
    h.className = "nav-section"; h.textContent = sec.label; nav.appendChild(h);
    permitidas.forEach(r=>{
      const b = document.createElement("button");
      b.className = "nav-item"; b.dataset.route = r;
      b.innerHTML = `<span class="ico" style="display:flex;align-items:center;width:20px">${ROUTES[r].ico}</span><span>${ROUTES[r].titulo}</span>`;
      b.onclick = ()=> navegar(r);
      nav.appendChild(b);
    });
  });

  // Primeira rota acessível
  const primeiraRota = perfil === "motorista" ? "romaneio"
    : perfil === "admin" ? "dashboard"
    : (currentUser.modulos||[])[0] || "clientes";
  navegar(primeiraRota);

  // Botão do tour no rodapé da sidebar
  const btnTour = document.createElement("button");
  btnTour.className = "nav-item";
  btnTour.style.cssText = "margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:14px;color:#a9c0da";
  btnTour.innerHTML = `<span class="ico" style="display:flex;align-items:center;width:20px">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </span><span>Tour do sistema</span>`;
  btnTour.onclick = ()=> abrirBoasVindas(navegar);
  $("#sidebar-nav").appendChild(btnTour);
}

/* ==================== ROTEAMENTO ==================== */
async function navegar(rota){
  const def = ROUTES[rota];
  if(!def || !temAcesso(rota))
    return toast("Acesso não permitido.", true);
  $$(".nav-item").forEach(n=> n.classList.toggle("active", n.dataset.route===rota));
  $("#page-title").textContent = def.titulo;
  const view = $("#view");
  view.innerHTML = `<div class="text-muted" style="padding:40px;text-align:center">Carregando...</div>`;
  try { await def.render(view, currentUser); }
  catch(err){
    console.error(err);
    view.innerHTML = `<div class="panel"><div class="panel-body">Erro ao carregar módulo: ${err.message}</div></div>`;
  }
  $("#app-shell").classList.remove("mobile-open");
  $("#overlay").classList.add("hidden");
}

/* ==================== EVENTOS GLOBAIS ==================== */
function bindGlobal(){
  $("#btn-login").onclick = ()=> login($("#login-email").value, $("#login-pass").value);
  $("#login-pass").addEventListener("keydown", e=>{
    if(e.key==="Enter") login($("#login-email").value, $("#login-pass").value);
  });
  $("#btn-logout").onclick = logout;
  $("#sidebar-toggle").onclick = ()=> $("#app-shell").classList.toggle("collapsed");
  $("#mobile-menu").onclick = ()=>{
    $("#app-shell").classList.add("mobile-open");
    $("#overlay").classList.remove("hidden");
  };
  $("#overlay").onclick = ()=>{
    $("#app-shell").classList.remove("mobile-open");
    $("#overlay").classList.add("hidden");
  };
  $("#modal-close").onclick = closeModal;
  $("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
}

/* ==================== BOOTSTRAP ==================== */
bindGlobal();

const saved = sessionStorage.getItem("mc_user");
if(saved) entrar(JSON.parse(saved));

if(USE_FIREBASE && auth){
  const { onAuthStateChanged } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  const { doc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  onAuthStateChanged(auth, async firebaseUser=>{
    if(firebaseUser && !currentUser){
      const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid)).catch(()=>null);
      const dados = snap?.exists()
        ? snap.data()
        : { nome: firebaseUser.email.split("@")[0], perfil:"admin" };
      entrar({ id:firebaseUser.uid, email:firebaseUser.email, ...dados });
    }
    if(!firebaseUser && currentUser){
      await logout();
    }
  });
}
