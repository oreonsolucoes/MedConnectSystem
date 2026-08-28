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
import { renderResponsaveis } from "./modules/responsaveis.js";

/* ---------------- Rotas + permissões ---------------- */
const ICO_RESP = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg>`;

const ROUTES = {
  dashboard:    { titulo:"Dashboard",    ico:"📊", perfis:["admin"],             render:(v)=>Dashboard.render(v) },
  romaneio:     { titulo:"Romaneio",     ico:"🚚", perfis:["admin","motorista"], render:(v,u)=>Romaneio.render(v,u) },
  locacoes:     { titulo:"Locações",     ico:"📅", perfis:["admin"],             render:(v)=>Locacoes.render(v) },
  clientes:     { titulo:"Clientes",     ico:"👥", perfis:["admin"],             render:(v)=>renderClientes(v) },
  equipamentos: { titulo:"Equipamentos", ico:"🔬", perfis:["admin"],             render:(v)=>renderEquipamentos(v) },
  motoristas:   { titulo:"Motoristas",   ico:"🧑‍✈️", perfis:["admin"],          render:(v)=>renderMotoristas(v) },
  responsaveis: { titulo:"Responsáveis", ico:ICO_RESP, perfis:["admin"],         render:(v)=>renderResponsaveis(v) },
  fornecedores: { titulo:"Fornecedores", ico:"🤝", perfis:["admin"],             render:(v)=>renderFornecedores(v) },
  financeiro:   { titulo:"Financeiro",   ico:"💰", perfis:["admin"],             render:(v)=>Financeiro.render(v) }
};

const NAV_SECTIONS = [
  { label:"Operação",  rotas:["dashboard","romaneio","locacoes"] },
  { label:"Cadastros", rotas:["clientes","equipamentos","motoristas","responsaveis","fornecedores"] },
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

      // Tenta buscar perfil no Firestore (coleção "usuarios", doc = uid)
      const snap = await getDoc(doc(db, "usuarios", cred.user.uid));
      const perfil = snap.exists()
        ? snap.data()
        : { nome: cred.user.email.split("@")[0], perfil:"admin" };

      entrar({ id:cred.user.uid, email:cred.user.email, ...perfil });
    } else {
      // Modo demo local
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
      b.innerHTML = `<span class="ico">${ROUTES[r].ico}</span><span>${ROUTES[r].titulo}</span>`;
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
  $("#sidebar-nav").appendChild(btnTour);
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

// Sessão persistente (página recarregada)
const saved = sessionStorage.getItem("mc_user");
if(saved) entrar(JSON.parse(saved));

// Firebase Auth: detecta sessão ativa mesmo sem sessionStorage
if(USE_FIREBASE && auth){
  const { onAuthStateChanged } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  const { doc, getDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

  onAuthStateChanged(auth, async firebaseUser=>{
    if(firebaseUser && !currentUser){
      // Usuário já autenticado no Firebase mas sem sessão local — restaura
      const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid)).catch(()=>null);
      const perfil = snap?.exists()
        ? snap.data()
        : { nome: firebaseUser.email.split("@")[0], perfil:"admin" };
      entrar({ id:firebaseUser.uid, email:firebaseUser.email, ...perfil });
    }
    if(!firebaseUser && currentUser){
      // Firebase expirou a sessão
      await logout();
    }
  });
}
