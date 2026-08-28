/* ===================================================================
   MedConnect · App principal
   Roteamento SPA · Firebase Authentication · RBAC por perfil
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

/* ---------------- Rotas + permissões ---------------- */
/* Ícones Lucide SVG — profissionais e consistentes */
const ICO = {
  dashboard:    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  romaneio:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  locacoes:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  clientes:     `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  equipamentos: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="1"/></svg>`,
  motoristas:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M8.5 14.5A5 5 0 0 0 12 16a5 5 0 0 0 3.5-1.5"/><circle cx="9" cy="11" r="1" fill="currentColor"/><circle cx="15" cy="11" r="1" fill="currentColor"/></svg>`,
  fornecedores: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  financeiro:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
};

const ROUTES = {
  dashboard:    { titulo:"Dashboard",    ico:ICO.dashboard,    perfis:["admin"],             render:(v)=>Dashboard.render(v) },
  romaneio:     { titulo:"Romaneio",     ico:ICO.romaneio,     perfis:["admin","motorista"], render:(v,u)=>Romaneio.render(v,u) },
  locacoes:     { titulo:"Locações",     ico:ICO.locacoes,     perfis:["admin"],             render:(v)=>Locacoes.render(v) },
  clientes:     { titulo:"Clientes",     ico:ICO.clientes,     perfis:["admin"],             render:(v)=>renderClientes(v) },
  equipamentos: { titulo:"Equipamentos", ico:ICO.equipamentos, perfis:["admin"],             render:(v)=>renderEquipamentos(v) },
  motoristas:   { titulo:"Motoristas",   ico:ICO.motoristas,   perfis:["admin"],             render:(v)=>renderMotoristas(v) },
  fornecedores: { titulo:"Fornecedores", ico:ICO.fornecedores, perfis:["admin"],             render:(v)=>renderFornecedores(v) },
  financeiro:   { titulo:"Financeiro",   ico:ICO.financeiro,   perfis:["admin"],             render:(v)=>Financeiro.render(v) }
};

const NAV_SECTIONS = [
  { label:"Operação",  rotas:["dashboard","romaneio","locacoes"] },
  { label:"Cadastros", rotas:["clientes","equipamentos","motoristas","fornecedores"] },
  { label:"Gestão",    rotas:["financeiro"] }
];

let currentUser = null;

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
      const perfil = snap.exists()
        ? snap.data()
        : { nome: cred.user.email.split("@")[0], perfil:"admin" };

      entrar({ id:cred.user.uid, email:cred.user.email, ...perfil });
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
  $("#side-name").textContent   = currentUser.nome  || currentUser.email;
  $("#side-role").textContent   = currentUser.perfil === "admin" ? "Administrador" : "Motorista";
  $("#side-avatar").textContent = (currentUser.nome||currentUser.email)[0].toUpperCase();
  $("#top-user").textContent    = currentUser.nome  || currentUser.email;

  const nav = $("#sidebar-nav"); nav.innerHTML = "";
  NAV_SECTIONS.forEach(sec=>{
    const permitidas = sec.rotas.filter(r => ROUTES[r].perfis.includes(currentUser.perfil));
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

  navegar(currentUser.perfil === "motorista" ? "romaneio" : "dashboard");

  // Botão do tour no rodapé da sidebar
  const btnTour = document.createElement("button");
  btnTour.className = "nav-item";
  btnTour.style.cssText = "margin-top:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:14px;color:#a9c0da";
  btnTour.innerHTML = `<span class="ico" style="display:flex;align-items:center;width:20px">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </span><span>Tour do sistema</span>`;
  btnTour.onclick = ()=> abrirBoasVindas(navegar);
  nav.appendChild(btnTour);
}

/* ==================== ROTEAMENTO ==================== */
async function navegar(rota){
  const def = ROUTES[rota];
  if(!def || !def.perfis.includes(currentUser.perfil))
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
      const perfil = snap?.exists()
        ? snap.data()
        : { nome: firebaseUser.email.split("@")[0], perfil:"admin" };
      entrar({ id:firebaseUser.uid, email:firebaseUser.email, ...perfil });
    }
    if(!firebaseUser && currentUser){
      await logout();
    }
  });
}
