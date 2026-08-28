/* ===================================================================
   MedConnect · App principal
   Roteamento SPA sem reload · Autenticação · Controle de perfil (RBAC)
   =================================================================== */
import { USE_FIREBASE, auth } from "./firebase-config.js";
import { $, $$, toast, closeModal } from "./modules/utils.js";
import { usuarios } from "./modules/mock-data.js";

import * as Dashboard  from "./modules/dashboard.js";
import * as Locacoes   from "./modules/locacoes.js";
import * as Romaneio   from "./modules/romaneio.js";
import * as Financeiro from "./modules/financeiro.js";
import {
  renderClientes, renderMotoristas, renderFornecedores, renderEquipamentos
} from "./modules/cadastros.js";

/* ---------------- Definição de rotas + permissões ---------------- */
const ROUTES = {
  dashboard:    { titulo:"Dashboard",     ico:"📊", perfis:["admin"],              render:(v)=>Dashboard.render(v) },
  romaneio:     { titulo:"Romaneio",      ico:"🚚", perfis:["admin","motorista"],  render:(v,u)=>Romaneio.render(v,u) },
  locacoes:     { titulo:"Locações",      ico:"📅", perfis:["admin"],              render:(v)=>Locacoes.render(v) },
  clientes:     { titulo:"Clientes",      ico:"👥", perfis:["admin"],              render:(v)=>renderClientes(v) },
  equipamentos: { titulo:"Equipamentos",  ico:"🔬", perfis:["admin"],              render:(v)=>renderEquipamentos(v) },
  motoristas:   { titulo:"Motoristas",    ico:"🧑‍✈️", perfis:["admin"],           render:(v)=>renderMotoristas(v) },
  fornecedores: { titulo:"Fornecedores",  ico:"🤝", perfis:["admin"],              render:(v)=>renderFornecedores(v) },
  financeiro:   { titulo:"Financeiro",    ico:"💰", perfis:["admin"],              render:(v)=>Financeiro.render(v) }
};

const NAV_SECTIONS = [
  { label:"Operação", rotas:["dashboard","romaneio","locacoes"] },
  { label:"Cadastros", rotas:["clientes","equipamentos","motoristas","fornecedores"] },
  { label:"Gestão", rotas:["financeiro"] }
];

let currentUser = null;

/* ============================ AUTH ============================ */
async function login(email, senha){
  $("#login-error").textContent = "";
  $("#btn-login").disabled = true;
  $("#btn-login").textContent = "Entrando...";
  try {
    if(USE_FIREBASE){
      const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
      const cred = await signInWithEmailAndPassword(auth, email.trim(), senha);
      // Busca o perfil do usuário no Firestore
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getDoc(doc(db, "usuarios", cred.user.uid));
      const perfil = snap.exists() ? snap.data() : { nome: cred.user.email, perfil: "admin" };
      entrar({ id: cred.user.uid, email: cred.user.email, ...perfil });
    } else {
      const u = usuarios.find(x => x.email === email.trim().toLowerCase() && x.senha === senha);
      if (!u) throw new Error("inválido");
      entrar(u);
    }
  } catch(e){
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

function logout(){
  currentUser = null;
  sessionStorage.removeItem("mc_user");
  $("#app-shell").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
  $("#login-email").value = ""; $("#login-pass").value = "";
}

/* ==================== INTERFACE / RBAC ==================== */
function montarInterface(){
  // Badge do usuário
  $("#side-name").textContent  = currentUser.nome;
  $("#side-role").textContent  = currentUser.perfil === "admin" ? "Administrador" : "Motorista";
  $("#side-avatar").textContent= currentUser.nome[0].toUpperCase();
  $("#top-user").textContent   = currentUser.nome;

  // Menu conforme perfil
  const nav = $("#sidebar-nav"); nav.innerHTML = "";
  NAV_SECTIONS.forEach(sec=>{
    const permitidas = sec.rotas.filter(r => ROUTES[r].perfis.includes(currentUser.perfil));
    if (!permitidas.length) return;
    const h = document.createElement("div"); h.className="nav-section"; h.textContent=sec.label; nav.appendChild(h);
    permitidas.forEach(r=>{
      const b = document.createElement("button");
      b.className = "nav-item"; b.dataset.route = r;
      b.innerHTML = `<span class="ico">${ROUTES[r].ico}</span><span>${ROUTES[r].titulo}</span>`;
      b.onclick = ()=> navegar(r);
      nav.appendChild(b);
    });
  });

  // Rota inicial (motorista cai no romaneio)
  navegar(currentUser.perfil === "motorista" ? "romaneio" : "dashboard");
}

/* ==================== ROTEAMENTO ==================== */
async function navegar(rota){
  const def = ROUTES[rota];
  if (!def || !def.perfis.includes(currentUser.perfil)){
    return toast("Acesso não permitido para este perfil.", true);
  }
  $$(".nav-item").forEach(n=> n.classList.toggle("active", n.dataset.route===rota));
  $("#page-title").textContent = def.titulo;
  const view = $("#view");
  view.innerHTML = `<div class="text-muted" style="padding:40px;text-align:center">Carregando...</div>`;
  try { await def.render(view, currentUser); }
  catch(err){ console.error(err); view.innerHTML = `<div class="panel"><div class="panel-body">Erro ao carregar módulo.</div></div>`; }
  // fecha menu no mobile
  $("#app-shell").classList.remove("mobile-open");
  $("#overlay").classList.add("hidden");
}

/* ==================== EVENTOS GLOBAIS ==================== */
function bindGlobal(){
  $("#btn-login").onclick = ()=> login($("#login-email").value, $("#login-pass").value);
  $("#login-pass").addEventListener("keydown", e=>{ if(e.key==="Enter") login($("#login-email").value, $("#login-pass").value); });
  $$("[data-demo]").forEach(b=> b.onclick=()=>{
    const perfil = b.dataset.demo;
    const u = usuarios.find(x => x.perfil === perfil);
    entrar(u);
  });

  $("#btn-logout").onclick = logout;

  // Recolher sidebar (desktop)
  $("#sidebar-toggle").onclick = ()=> $("#app-shell").classList.toggle("collapsed");

  // Menu mobile
  $("#mobile-menu").onclick = ()=>{
    $("#app-shell").classList.add("mobile-open");
    $("#overlay").classList.remove("hidden");
  };
  $("#overlay").onclick = ()=>{
    $("#app-shell").classList.remove("mobile-open");
    $("#overlay").classList.add("hidden");
  };

  // Modal
  $("#modal-close").onclick = closeModal;
  $("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
}

/* ==================== BOOTSTRAP ==================== */
bindGlobal();

// Sessão persistente
const saved = sessionStorage.getItem("mc_user");
if (saved){ entrar(JSON.parse(saved)); }

// Integração real com Firebase Auth (quando ativado)
if (USE_FIREBASE && auth){
  const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  onAuthStateChanged(auth, user=>{
    // Mapeie o e-mail autenticado ao perfil desejado no seu Firestore.
    // Aqui mantemos o fluxo demo; adapte conforme sua coleção "usuarios".
  });
}
