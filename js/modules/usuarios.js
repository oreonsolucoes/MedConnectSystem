/* ===================================================================
   Módulo: Usuários (Admin)
   - Lista usuários do sistema
   - Cria novos usuários via Firebase Auth REST API
   - Define perfil e módulos acessíveis por usuário
   =================================================================== */
import { USE_FIREBASE, db, app } from "../firebase-config.js";
import { $, esc, toast } from "./utils.js";

/* Módulos disponíveis para seleção */
const MODULOS = [
  { key:"romaneio",     label:"Romaneio" },
  { key:"locacoes",     label:"Locações" },
  { key:"clientes",     label:"Clientes" },
  { key:"equipamentos", label:"Equipamentos" },
  { key:"motoristas",   label:"Motoristas" },
  { key:"responsaveis", label:"Responsáveis" },
  { key:"fornecedores", label:"Fornecedores" },
  { key:"financeiro",   label:"Financeiro" },
  { key:"convites",     label:"Convites" },
];

function checksModulos(selecionados = []){
  return MODULOS.map(m => `
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px 0;border-bottom:1px solid #f1f5f9">
      <input type="checkbox" name="mod" value="${m.key}" ${selecionados.includes(m.key)?"checked":""} style="width:16px;height:16px;accent-color:#0d4f8b">
      <span style="font-size:14px">${m.label}</span>
    </label>`).join("");
}

function getModulosSelecionados(container){
  return [...container.querySelectorAll('input[name="mod"]:checked')].map(i=>i.value);
}

export async function render(view){
  view.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Usuários do sistema</h2>
        <p class="sub">Gerencie acessos e permissões de cada usuário</p>
      </div>
      <button class="btn btn-primary" id="btn-novo-usuario">+ Novo usuário</button>
    </div>

    <!-- PAINEL NOVO USUÁRIO -->
    <div id="painel-usuario" class="panel" style="display:none;margin-bottom:16px">
      <div class="panel-body">
        <h3 id="painel-titulo" style="margin-bottom:16px;font-size:15px;color:#12243f">Criar novo usuário</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px">Nome <span style="color:#e55">*</span></label>
            <input id="u-nome" placeholder="Nome completo" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px">
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px">E-mail <span style="color:#e55">*</span></label>
            <input id="u-email" type="email" placeholder="usuario@email.com" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px">
          </div>
          <div id="u-senha-wrap">
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px">Senha inicial <span style="color:#e55">*</span></label>
            <input id="u-senha" type="password" placeholder="Mínimo 6 caracteres" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px">
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px">Perfil <span style="color:#e55">*</span></label>
            <select id="u-perfil" style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px;background:#fff">
              <option value="operacional">Operacional (módulos selecionados)</option>
              <option value="admin">Administrador (acesso total)</option>
              <option value="motorista">Motorista (apenas Romaneio)</option>
            </select>
          </div>
        </div>

        <!-- Módulos (visível só para "operacional") -->
        <div id="u-modulos-wrap" style="margin-bottom:14px">
          <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:8px">Módulos com acesso</label>
          <div id="u-modulos-lista" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0 24px;background:#f8fafc;border:1.5px solid var(--line);border-radius:8px;padding:10px 14px">
            ${checksModulos()}
          </div>
        </div>

        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" id="btn-salvar-usuario">Salvar</button>
          <button class="btn btn-ghost" id="btn-fechar-usuario">Cancelar</button>
        </div>
        <div id="u-erro" style="margin-top:10px;color:#c0392b;font-size:13px"></div>
      </div>
    </div>

    <!-- TABELA DE USUÁRIOS -->
    <div class="panel"><div class="panel-body flush" id="usuarios-list">
      <div style="padding:32px;text-align:center;color:#64748b">Carregando...</div>
    </div></div>`;

  /* Mostrar/ocultar módulos conforme perfil */
  const perfilSel = document.getElementById("u-perfil");
  const modulosWrap = document.getElementById("u-modulos-wrap");
  perfilSel.onchange = ()=>{
    modulosWrap.style.display = perfilSel.value === "operacional" ? "" : "none";
  };
  modulosWrap.style.display = ""; // começa visível (operacional é default)

  /* Abrir/fechar painel */
  let editandoId = null;
  const painel = document.getElementById("painel-usuario");
  const abrirPainel = (dados = null)=>{
    editandoId = dados?.id || null;
    document.getElementById("painel-titulo").textContent = dados ? "Editar usuário" : "Criar novo usuário";
    document.getElementById("u-nome").value  = dados?.nome  || "";
    document.getElementById("u-email").value = dados?.email || "";
    document.getElementById("u-senha").value = "";
    document.getElementById("u-perfil").value = dados?.perfil || "operacional";
    document.getElementById("u-modulos-lista").innerHTML = checksModulos(dados?.modulos || []);
    document.getElementById("u-senha-wrap").style.display = dados ? "none" : ""; // esconde senha ao editar
    modulosWrap.style.display = (dados?.perfil||"operacional") === "operacional" ? "" : "none";
    document.getElementById("u-erro").textContent = "";
    painel.style.display = "";
    document.getElementById("u-nome").focus();
  };
  document.getElementById("btn-novo-usuario").onclick = ()=> abrirPainel();
  document.getElementById("btn-fechar-usuario").onclick = ()=>{ painel.style.display="none"; editandoId=null; };

  /* Salvar usuário */
  document.getElementById("btn-salvar-usuario").onclick = async()=>{
    const nome   = document.getElementById("u-nome").value.trim();
    const email  = document.getElementById("u-email").value.trim();
    const senha  = document.getElementById("u-senha").value;
    const perfil = document.getElementById("u-perfil").value;
    const modulos = perfil === "operacional"
      ? getModulosSelecionados(document.getElementById("u-modulos-lista"))
      : [];

    const erros = [];
    if(!nome)  erros.push("Nome");
    if(!email) erros.push("E-mail");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.push("E-mail inválido");
    if(!editandoId && (!senha || senha.length < 6)) erros.push("Senha (mín. 6 caracteres)");
    if(perfil === "operacional" && !modulos.length) erros.push("Selecione ao menos 1 módulo");

    if(erros.length){
      document.getElementById("u-erro").textContent = "⚠️ " + erros.join(", ");
      return;
    }

    const btn = document.getElementById("btn-salvar-usuario");
    btn.disabled = true; btn.textContent = "Salvando...";

    try {
      if(USE_FIREBASE){
        const { doc, setDoc, updateDoc, collection, getDocs } = await import(
          "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");

        if(editandoId){
          // Apenas atualiza dados no Firestore (não muda senha aqui)
          await updateDoc(doc(db, "usuarios", editandoId), { nome, perfil, modulos });
          toast("Usuário atualizado!");
        } else {
          // Cria via Firebase Auth REST API (não exige Admin SDK)
          const apiKey = app.options.apiKey;

          const resp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
            { method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ email, password:senha, returnSecureToken:true }) });
          const data = await resp.json();
          if(data.error) throw new Error(data.error.message);

          const uid = data.localId;
          await setDoc(doc(db, "usuarios", uid), { nome, email, perfil, modulos });
          toast("Usuário criado! A senha pode ser alterada pelo próprio usuário.");
        }
      } else {
        toast("Criação de usuários requer Firebase ativo.", true);
        return;
      }
      painel.style.display = "none"; editandoId = null;
      await carregarUsuarios();
    } catch(e){
      console.error(e);
      document.getElementById("u-erro").textContent =
        "⚠️ Erro: " + (e.message.includes("EMAIL_EXISTS") ? "E-mail já cadastrado." :
                        e.message.includes("WEAK_PASSWORD") ? "Senha fraca (min. 6 caracteres)." :
                        e.message);
    } finally {
      btn.disabled = false; btn.textContent = "Salvar";
    }
  };

  await carregarUsuarios();

  async function carregarUsuarios(){
    const list = document.getElementById("usuarios-list");
    if(!USE_FIREBASE){
      list.innerHTML = `<div style="padding:32px;text-align:center;color:#64748b">Gestão de usuários requer Firebase ativo.</div>`;
      return;
    }
    try {
      const { collection, getDocs } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const snap = await getDocs(collection(db, "usuarios"));
      const usuarios = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      renderTabela(usuarios, list);
    } catch(e){
      list.innerHTML = `<div style="padding:32px;text-align:center;color:#c0392b">Erro ao carregar usuários: ${esc(e.message)}</div>`;
    }
  }

  function renderTabela(usuarios, list){
    if(!usuarios.length){
      list.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b">Nenhum usuário cadastrado.</div>`;
      return;
    }
    const perfilLabel = { admin:"Administrador", operacional:"Operacional", motorista:"Motorista" };
    const perfilCor   = { admin:"#0d4f8b", operacional:"#1e9e6a", motorista:"#a9760a" };
    list.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr>
        <th>Nome</th><th>E-mail</th><th>Perfil</th><th>Módulos</th><th></th>
      </tr></thead><tbody>
      ${usuarios.map(u=>`<tr>
        <td><strong>${esc(u.nome||"—")}</strong></td>
        <td>${esc(u.email||"—")}</td>
        <td>
          <span class="badge" style="background:${(perfilCor[u.perfil]||"#64748b")}18;color:${perfilCor[u.perfil]||"#64748b"}">
            ${perfilLabel[u.perfil]||u.perfil}
          </span>
        </td>
        <td style="font-size:12px;color:#64748b">
          ${u.perfil==="admin" ? "Acesso total"
            : u.perfil==="motorista" ? "Romaneio"
            : (u.modulos||[]).map(m=> MODULOS.find(x=>x.key===m)?.label||m).join(", ")||"—"}
        </td>
        <td class="text-right" style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-edit-uid="${u.id}" data-edit='${JSON.stringify({id:u.id,nome:u.nome,email:u.email,perfil:u.perfil,modulos:u.modulos||[]})}'>✏️ Editar</button>
          <button class="btn-icon" data-del-uid="${u.id}" title="Excluir usuário">🗑️</button>
        </td>
      </tr>`).join("")}
      </tbody></table></div>`;

    list.querySelectorAll("[data-edit-uid]").forEach(b=> b.onclick=()=>{
      try{ abrirPainel(JSON.parse(b.dataset.edit)); } catch(e){}
    });
    list.querySelectorAll("[data-del-uid]").forEach(b=> b.onclick=async()=>{
      if(!confirm("Excluir este usuário? Esta ação não remove o acesso ao Firebase Auth.")) return;
      try {
        const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        await deleteDoc(doc(db, "usuarios", b.dataset.delUid));
        toast("Usuário removido do sistema.");
        await carregarUsuarios();
      } catch(e){ toast("Erro ao remover: "+e.message, true); }
    });
  }
}
