/* ===================================================================
   Módulo: Responsáveis
   Cadastro de responsáveis pela locação com tipo e valor de comissão.
   Quando o responsável não é Vilma, a comissão é descontada do lucro.
   =================================================================== */
import { Store } from "./store.js";
import { $, esc, openModal, closeModal, toast, BRL } from "./utils.js";

export async function renderResponsaveis(view){
  view.innerHTML = `
    <div class="page-head">
      <div><h2>Responsáveis</h2>
      <p class="sub">Equipe técnica com comissão automática nas locações</p></div>
      <button class="btn btn-primary" id="btn-new-resp">+ Novo responsável</button>
    </div>
    <div class="toolbar"><div class="search"><input id="resp-search" placeholder="Buscar..."/></div></div>
    <div class="panel"><div class="panel-body flush">
      <div class="table-wrap"><table class="data" id="resp-table">
        <thead><tr>
          <th>Nome</th><th>Tipo de comissão</th><th>Valor</th><th>Principal</th><th></th>
        </tr></thead>
        <tbody id="resp-tbody"></tbody>
      </table></div>
    </div></div>`;

  $("#btn-new-resp").onclick = ()=> form();
  const tbody = $("#resp-tbody");

  tbody.addEventListener("click", async e=>{
    if(e.target.closest("[data-edit-r]")){
      const id = e.target.closest("[data-edit-r]").dataset.editR;
      const lista = await Store.list("responsaveis");
      form(lista.find(x=>x.id===id));
    }
    if(e.target.closest("[data-del-r]")){
      const id = e.target.closest("[data-del-r]").dataset.delR;
      if(confirm("Excluir responsável?")){ await Store.remove("responsaveis",id); toast("Excluído"); }
    }
  });

  Store.watch("responsaveis", lista=>{
    const q = ($("#resp-search")?.value||"").toLowerCase();
    const filtrada = q ? lista.filter(r=>r.nome.toLowerCase().includes(q)) : lista;
    tbody.innerHTML = filtrada.map(r=>`
      <tr>
        <td><strong>${esc(r.nome)}</strong></td>
        <td><span class="badge ${r.comissaoTipo==="nenhuma"?"badge-muted":"badge-info"}">
          ${r.comissaoTipo==="nenhuma"?"Sem comissão":r.comissaoTipo==="fixo"?"Valor fixo":"Percentual"}
        </span></td>
        <td class="mono">${r.comissaoTipo==="nenhuma"?"—":r.comissaoTipo==="fixo"?BRL(r.comissaoValor):`${r.comissaoValor}%`}</td>
        <td>${r.ehPrincipal?'<span class="badge badge-ok">Principal</span>':'—'}</td>
        <td class="text-right">
          <button class="btn-icon" data-edit-r="${r.id}">✏️</button>
          <button class="btn-icon" data-del-r="${r.id}">🗑️</button>
        </td>
      </tr>`).join("") ||
      `<tr><td colspan="5" class="text-muted" style="padding:24px;text-align:center">Nenhum responsável cadastrado.</td></tr>`;
  });

  $("#resp-search").oninput = e=>{
    const q = e.target.value.toLowerCase();
    tbody.querySelectorAll("tr").forEach(tr=>
      tr.style.display = tr.textContent.toLowerCase().includes(q)?"":"none");
  };

  function form(r={}){
    openModal(r.id?"Editar responsável":"Novo responsável",`
      <div class="form-grid">
        <div class="field full"><label>Nome</label>
          <input id="r-nome" value="${esc(r.nome||"")}"></div>
        <div class="field"><label>Tipo de comissão</label>
          <select id="r-tipo">
            <option value="nenhuma" ${r.comissaoTipo==="nenhuma"||!r.comissaoTipo?"selected":""}>Sem comissão (ex: Vilma)</option>
            <option value="fixo"    ${r.comissaoTipo==="fixo"?"selected":""}>Valor fixo (R$)</option>
            <option value="percent" ${r.comissaoTipo==="percent"?"selected":""}>Percentual (%)</option>
          </select></div>
        <div class="field"><label id="r-val-label">Valor da comissão</label>
          <input type="number" id="r-valor" value="${r.comissaoValor||0}"></div>
        <div class="field full">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" id="r-principal" ${r.ehPrincipal?"checked":""} style="width:18px;height:18px;accent-color:var(--brand)">
            Responsável principal (aparece como padrão nas locações)
          </label></div>
        <div class="field full" style="background:#f0f7ff;padding:12px;border-radius:10px;font-size:13px;color:#0d4f8b">
          💡 Quando este responsável for selecionado numa locação, o valor da comissão será 
          descontado automaticamente do lucro líquido e registrado no financeiro.
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" id="r-cancel">Cancelar</button>
          <button class="btn btn-primary" id="r-save">Salvar</button>
        </div>
      </div>`);

    const atualizaLabel = ()=>{
      const tipo = $("#r-tipo").value;
      $("#r-val-label").textContent = tipo==="percent"?"Percentual (%)":"Valor fixo (R$)";
      $("#r-valor").style.display = tipo==="nenhuma"?"none":"";
    };
    $("#r-tipo").onchange = atualizaLabel; atualizaLabel();

    $("#r-cancel").onclick = closeModal;
    $("#r-save").onclick = async()=>{
      const nome = $("#r-nome").value.trim();
      if(!nome) return toast("Informe o nome",true);
      const data = {
        nome, comissaoTipo:$("#r-tipo").value,
        comissaoValor:+$("#r-valor").value||0,
        ehPrincipal:$("#r-principal").checked
      };
      if(r.id) await Store.update("responsaveis",r.id,data);
      else     await Store.add("responsaveis",data);
      closeModal(); toast("Responsável salvo");
    };
  }
}

/** Retorna o valor de comissão de um responsável dado o valor da locação */
export function calcularComissao(responsavel, valorLocacao){
  if(!responsavel) return 0;
  if(responsavel.comissaoTipo==="fixo")    return Number(responsavel.comissaoValor)||0;
  if(responsavel.comissaoTipo==="percent") return (Number(responsavel.comissaoValor)||0)/100 * valorLocacao;
  return 0;
}
