/* ===================================================================
   Módulo: Convites de Auto-Cadastro
   - Gera link único por cliente com token
   - Envia via WhatsApp (wa.me)
   - Rastreia status: pendente → aberto → preenchido
   =================================================================== */
import { Store } from "./store.js";
import { $, esc, toast, BRL } from "./utils.js";

const BASE_URL = "https://oreonsolucoes.github.io/MedConnectSystem/cadastro.html";

function gerarToken(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function fmtFone(tel){
  // Remove tudo que não é número
  const n = (tel||"").replace(/\D/g,"");
  // Garante código do país (55 = Brasil)
  return n.startsWith("55") ? n : "55"+n;
}

function statusBadge(s){
  const map = {
    pendente: `<span class="badge" style="background:#f1f5f9;color:#64748b">⏳ Pendente</span>`,
    aberto:   `<span class="badge" style="background:#fdf3dc;color:#a9760a">👁️ Aberto</span>`,
    preenchido:`<span class="badge" style="background:#e2f5ec;color:#1e9e6a">✅ Preenchido</span>`
  };
  return map[s] || map.pendente;
}

function fmtDt(ts){
  if(!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}) +
    " " + d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}

export async function renderConvites(view){
  view.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Convites de cadastro</h2>
        <p class="sub">Envie links únicos de auto-cadastro para clientes via WhatsApp</p>
      </div>
      <button class="btn btn-primary" id="btn-novo-convite">+ Novo convite</button>
    </div>

    <!-- PAINEL NOVO CONVITE -->
    <div id="painel-novo" class="panel" style="display:none;margin-bottom:16px">
      <div class="panel-body">
        <h3 style="margin-bottom:14px;font-size:15px;color:#12243f">Criar novo convite</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end">
          <div>
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px">
              Nome do cliente <span style="color:#e55">*</span>
            </label>
            <input id="conv-nome" placeholder="Ex.: Dra. Ana Silva"
              style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px">
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;margin-bottom:5px">
              WhatsApp <span style="color:#e55">*</span>
            </label>
            <input id="conv-tel" placeholder="(11) 9xxxx-xxxx" type="tel"
              style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px">
          </div>
          <button class="btn btn-primary" id="btn-gerar" style="white-space:nowrap;padding:10px 18px">
            📲 Gerar e enviar
          </button>
        </div>
        <div id="conv-preview" style="display:none;margin-top:14px;background:#f0f7ff;border:1.5px solid #0d4f8b;border-radius:10px;padding:14px">
          <div style="font-size:12px;font-weight:700;color:#0d4f8b;margin-bottom:8px;text-transform:uppercase">Link gerado</div>
          <div id="conv-link" style="font-family:monospace;font-size:12px;color:#12243f;word-break:break-all;margin-bottom:10px"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" id="btn-whatsapp" style="flex:1;min-width:140px">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle;margin-right:6px"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Abrir WhatsApp
            </button>
            <button class="btn btn-ghost" id="btn-copiar" style="flex:1;min-width:140px">📋 Copiar link</button>
          </div>
        </div>
        <button class="btn btn-ghost" id="btn-fechar-painel" style="margin-top:10px;width:auto;padding:8px 16px;font-size:13px">✕ Fechar</button>
      </div>
    </div>

    <!-- FILTROS -->
    <div class="toolbar">
      <div class="search"><input id="conv-search" placeholder="Buscar por nome ou telefone..."/></div>
      <select id="filtro-status" class="btn btn-ghost">
        <option value="">Todos os status</option>
        <option value="pendente">⏳ Pendente</option>
        <option value="aberto">👁️ Aberto</option>
        <option value="preenchido">✅ Preenchido</option>
      </select>
    </div>

    <!-- CARDS DE RESUMO -->
    <div id="resumo-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px"></div>

    <!-- TABELA -->
    <div class="panel"><div class="panel-body flush" id="conv-list"></div></div>`;

  /* ---- Botão novo convite ---- */
  const painel = document.getElementById("painel-novo");
  document.getElementById("btn-novo-convite").onclick = ()=>{
    painel.style.display = painel.style.display==="none" ? "" : "none";
    document.getElementById("conv-preview").style.display = "none";
    document.getElementById("conv-nome").value = "";
    document.getElementById("conv-tel").value  = "";
  };
  document.getElementById("btn-fechar-painel").onclick = ()=>{ painel.style.display="none"; };

  /* ---- Gerar convite ---- */
  document.getElementById("btn-gerar").onclick = async()=>{
    const nome = document.getElementById("conv-nome").value.trim();
    const tel  = document.getElementById("conv-tel").value.trim();
    if(!nome || !tel) return toast("Informe nome e WhatsApp", true);

    const btn = document.getElementById("btn-gerar");
    btn.disabled = true; btn.textContent = "Gerando...";

    try {
      const token  = gerarToken();
      const link   = `${BASE_URL}?t=${token}`;
      const agora  = new Date().toISOString();

      /* Salva convite no Firestore */
      await Store.add("convites", {
        token,
        nomeCliente: nome,
        telefone:    tel,
        status:      "pendente",
        link,
        criadoEm:   agora,
        abertEm:    null,
        preenchidoEm: null
      });

      /* Mostra preview do link */
      document.getElementById("conv-link").textContent = link;
      document.getElementById("conv-preview").style.display = "";

      const msg = `Olá, ${nome}! 👋\n\nA Oreon Soluções preparou um link exclusivo para você concluir seu cadastro em nosso sistema de locação de tecnologia estética.\n\nAcesse aqui: ${link}\n\nÉ rápido e simples! Qualquer dúvida estamos à disposição. 💙`;

      /* WhatsApp */
      document.getElementById("btn-whatsapp").onclick = ()=>{
        const fone = fmtFone(tel);
        window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank");
      };

      /* Copiar link */
      document.getElementById("btn-copiar").onclick = ()=>{
        navigator.clipboard?.writeText(link).then(()=> toast("Link copiado!"))
          .catch(()=>{
            const el = document.createElement("textarea");
            el.value = link; document.body.appendChild(el);
            el.select(); document.execCommand("copy");
            el.remove(); toast("Link copiado!");
          });
      };

      toast("Convite gerado!");
    } catch(e){
      console.error(e); toast("Erro ao gerar convite", true);
    } finally {
      btn.disabled = false; btn.textContent = "📲 Gerar e enviar";
    }
  };

  /* ---- Watch na coleção convites ---- */
  Store.watch("convites", lista=>{
    const ordenada = [...lista].sort((a,b)=> (b.criadoEm||"").localeCompare(a.criadoEm||""));

    /* Resumo */
    const total      = lista.length;
    const pendentes  = lista.filter(c=>c.status==="pendente").length;
    const abertos    = lista.filter(c=>c.status==="aberto").length;
    const preench    = lista.filter(c=>c.status==="preenchido").length;
    document.getElementById("resumo-cards").innerHTML = [
      {label:"Total enviados", val:total,     cor:"#0d4f8b"},
      {label:"Pendentes",      val:pendentes,  cor:"#64748b"},
      {label:"Abertos",        val:abertos,    cor:"#a9760a"},
      {label:"Preenchidos",    val:preench,    cor:"#1e9e6a"},
    ].map(c=>`
      <div style="background:#fff;border-radius:12px;padding:14px 16px;border-top:3px solid ${c.cor};box-shadow:0 1px 3px rgba(0,0,0,.07)">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">${c.label}</div>
        <div style="font-size:28px;font-weight:800;color:${c.cor};margin-top:4px">${c.val}</div>
      </div>`).join("");

    /* Aplica filtros */
    const draw = (data)=>{
      const list = document.getElementById("conv-list");
      if(!data.length){
        list.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b">Nenhum convite encontrado.</div>`;
        return;
      }
      list.innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr>
          <th>Nome</th><th>WhatsApp</th><th>Status</th>
          <th>Criado em</th><th>Aberto em</th><th>Preenchido em</th><th></th>
        </tr></thead><tbody>
        ${data.map(c=>`<tr>
          <td><strong>${esc(c.nomeCliente||"—")}</strong></td>
          <td>${esc(c.telefone||"—")}</td>
          <td>${statusBadge(c.status)}</td>
          <td class="mono" style="font-size:12px">${fmtDt(c.criadoEm)}</td>
          <td class="mono" style="font-size:12px">${fmtDt(c.abertEm)}</td>
          <td class="mono" style="font-size:12px">${fmtDt(c.preenchidoEm)}</td>
          <td class="text-right" style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" data-reenviar="${c.id}" data-tel="${esc(c.telefone)}" data-link="${esc(c.link)}" data-nome="${esc(c.nomeCliente)}" title="Reenviar pelo WhatsApp">📲</button>
            <button class="btn-icon" data-copiar="${esc(c.link)}" title="Copiar link">📋</button>
            <button class="btn-icon" data-del-conv="${c.id}" title="Excluir">🗑️</button>
          </td>
        </tr>`).join("")}
        </tbody></table></div>`;

      /* Handlers */
      document.querySelectorAll("[data-reenviar]").forEach(b=> b.onclick=()=>{
        const nome = b.dataset.nome;
        const link = b.dataset.link;
        const msg = `Olá, ${nome}! 👋\n\nA Oreon Soluções preparou um link exclusivo para você concluir seu cadastro.\n\nAcesse aqui: ${link}\n\nQualquer dúvida estamos à disposição. 💙`;
        window.open(`https://wa.me/${fmtFone(b.dataset.tel)}?text=${encodeURIComponent(msg)}`, "_blank");
      });
      document.querySelectorAll("[data-copiar]").forEach(b=> b.onclick=()=>{
        navigator.clipboard?.writeText(b.dataset.copiar).then(()=> toast("Link copiado!"))
          .catch(()=>{ const el=document.createElement("textarea"); el.value=b.dataset.copiar; document.body.appendChild(el); el.select(); document.execCommand("copy"); el.remove(); toast("Link copiado!"); });
      });
      document.querySelectorAll("[data-del-conv]").forEach(b=> b.onclick=async()=>{
        if(!confirm("Excluir este convite?")) return;
        await Store.remove("convites", b.dataset.delConv);
        toast("Convite excluído");
      });
    };

    draw(ordenada);

    /* Busca + filtro de status */
    const applyFilters = ()=>{
      const q  = (document.getElementById("conv-search")?.value||"").toLowerCase();
      const st = document.getElementById("filtro-status")?.value||"";
      draw(ordenada.filter(c=>
        (c.nomeCliente+c.telefone).toLowerCase().includes(q) &&
        (!st || c.status===st)
      ));
    };
    document.getElementById("conv-search").oninput  = applyFilters;
    document.getElementById("filtro-status").onchange = applyFilters;
  });
}
