/* Módulo: Gestão de Locações (Core) ============================= */
import { Store } from "./store.js";
import { $, BRL, fmtData, lucroLiquido, esc, openModal, closeModal, toast } from "./utils.js";

export async function render(view){
  view.innerHTML = `
    <div class="page-head">
      <div><h2>Locações</h2><p class="sub">Agenda, valores e cálculo automático de lucro</p></div>
      <button class="btn btn-primary" id="btn-new">+ Nova locação</button>
    </div>
    <div class="toolbar">
      <div class="search"><input id="search" placeholder="Buscar por cliente ou tecnologia..." /></div>
      <select id="filtro-frota" class="btn btn-ghost">
        <option value="">Toda a frota</option>
        <option value="propria">Frota própria</option>
        <option value="sublocado">Sublocado</option>
      </select>
    </div>
    <div class="panel"><div class="panel-body flush" id="list"></div></div>`;

  const [clientes, equipamentos, motoristas] = await Promise.all([
    Store.list("clientes"), Store.list("equipamentos"), Store.list("motoristas")
  ]);

  $("#btn-new").onclick = ()=> form();

  Store.watch("locacoes", lista=>{
    const draw = data=>{
      const ordenada = [...data].sort((a,b)=> a.data.localeCompare(b.data));
      $("#list").innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr>
          <th>Data</th><th>Cliente</th><th>Tecnologia</th><th>Frota</th><th>Motorista</th>
          <th>Técnica</th><th class="text-right">Valor</th><th class="text-right">Líquido</th><th>Pgto</th><th></th>
        </tr></thead><tbody>
        ${ordenada.map(l=>`
          <tr>
            <td class="mono">${fmtData(l.data)}<br><span class="text-muted" style="font-size:11px">${esc(l.horario||"")}</span></td>
            <td><strong>${esc(l.cliente)}</strong></td>
            <td><span class="badge badge-info">${esc(l.tecnologia)}</span></td>
            <td>${l.frota==="sublocado"?'<span class="badge badge-subloc">Sublocado</span>':'<span class="badge badge-frota">Própria</span>'}</td>
            <td>${esc(l.motorista||"—")}</td>
            <td>${l.tecnica?'<span class="badge badge-ok">Sim</span>':'<span class="badge badge-muted">Não</span>'}</td>
            <td class="text-right mono">${BRL(l.valorCliente)}</td>
            <td class="text-right mono"><strong>${BRL(lucroLiquido(l))}</strong></td>
            <td>${l.statusPgto==="Pago"?'<span class="badge badge-ok">Pago</span>':'<span class="badge badge-warn">A receber</span>'}</td>
            <td class="text-right">
              <button class="btn-icon" data-edit="${l.id}">✏️</button>
              <button class="btn-icon" data-del="${l.id}">🗑️</button>
            </td>
          </tr>`).join("") || `<tr><td colspan="10" style="text-align:center;padding:24px" class="text-muted">Nenhuma locação.</td></tr>`}
        </tbody></table></div>`;

      document.querySelectorAll("[data-edit]").forEach(b=> b.onclick=()=> form(lista.find(x=>x.id===b.dataset.edit)));
      document.querySelectorAll("[data-del]").forEach(b=> b.onclick=async()=>{ if(confirm("Excluir locação?")){ await Store.remove("locacoes",b.dataset.del); toast("Excluída"); }});
    };
    draw(lista);
    const applyFilters = ()=>{
      const q = $("#search").value.toLowerCase();
      const fr = $("#filtro-frota").value;
      draw(lista.filter(l =>
        (l.cliente+l.tecnologia).toLowerCase().includes(q) && (!fr || l.frota===fr)));
    };
    $("#search").oninput = applyFilters;
    $("#filtro-frota").onchange = applyFilters;
  });

  function form(l={}){
    const opt = (arr, key, val, txt) => arr.map(o=>`<option value="${o[key]}" ${val===o[key]?"selected":""}>${esc(o[txt])}</option>`).join("");

    // Endereço inicial: já salvo na locação (ao editar) ou vazio (nova)
    const endInicial = l.endereco || "";

    openModal(l.id?"Editar locação":"Nova locação",`
      <div class="form-grid">
        <div class="field"><label>Data</label><input type="date" id="l-data" value="${l.data||""}"></div>
        <div class="field"><label>Horário</label><input id="l-hora" value="${esc(l.horario||"")}" placeholder="9h às 18h"></div>
        <div class="field"><label>Qtde de horas (período)</label><input id="l-periodo" value="${esc(l.periodo||"")}" placeholder="Ex.: 8h"></div>
        <div class="field">
          <label>Responsável pela locação</label>
          <input id="l-resp" value="Vilma" readonly
            style="background:#f1f5f9;color:var(--muted);font-weight:600;cursor:default">
        </div>
        <div class="field full"><label>Cliente</label>
          <select id="l-cli"><option value="">Selecione...</option>${opt(clientes,"id",l.clienteId,"nome")}</select>
        </div>
        <div class="field full">
          <label>Endereço da entrega <span style="font-weight:400;color:var(--muted)">(preenchido pelo cadastro do cliente)</span></label>
          <input id="l-end" value="${esc(endInicial)}" readonly placeholder="Selecione um cliente acima"
            style="background:#f1f5f9;color:var(--text)">
        </div>
        <div class="field full"><label>Equipamento</label><select id="l-eq"><option value="">Selecione...</option>${equipamentos.map(e=>`<option value="${e.id}" data-tec="${esc(e.tecnologia)}" data-frota="${e.frota}" ${l.equipamentoId===e.id?"selected":""}>${esc(e.modelo)} (${esc(e.serie)})</option>`).join("")}</select></div>
        <div class="field"><label>Técnica contratada?</label>
          <select id="l-tec"><option value="nao" ${!l.tecnica?"selected":""}>Não</option><option value="sim" ${l.tecnica?"selected":""}>Sim</option></select></div>
        <div class="field"><label>Custo da técnica (R$)</label><input type="number" id="l-tecval" value="${l.custoTecnica||0}"></div>
        <div class="field full"><label>Motorista</label><select id="l-mot"><option value="">Selecione...</option>${opt(motoristas,"id",l.motoristaId,"nome")}</select></div>
        <div class="field"><label>Custo transporte (R$)</label><input type="number" id="l-transp" value="${l.custoTransporte||0}"></div>
        <div class="field"><label>Custo pago ao motorista (R$)</label><input type="number" id="l-motcusto" value="${l.motoristaCusto||0}"></div>
        <div class="field"><label>Valor cobrado do cliente (R$)</label><input type="number" id="l-valor" value="${l.valorCliente||0}"></div>
        <div class="field"><label>Status de pagamento</label>
          <select id="l-pgto"><option ${l.statusPgto==="A Receber"?"selected":""}>A Receber</option><option ${l.statusPgto==="Pago"?"selected":""}>Pago</option></select></div>
        <div class="field full">
          <label>Lucro líquido (calculado automaticamente)</label>
          <input id="l-liq" readonly style="background:#f1f5f9;font-weight:700" value="R$ 0,00">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" id="l-cancel">Cancelar</button>
          <button class="btn btn-primary" id="l-save">Salvar</button>
        </div>
      </div>`);

    // Quando o cliente mudar → puxa o endereço comercial do cadastro
    $("#l-cli").onchange = ()=>{
      const cliId = $("#l-cli").value;
      const cli = clientes.find(c => c.id === cliId);
      $("#l-end").value = cli ? (cli.endComercial || cli.endResidencial || "") : "";
    };
    // Se já tem um cliente selecionado ao abrir (edição), garante que o endereço aparece
    if (l.clienteId && !endInicial){
      const cli = clientes.find(c => c.id === l.clienteId);
      if (cli) $("#l-end").value = cli.endComercial || cli.endResidencial || "";
    }

    const recalc = ()=>{
      const liq = (+$("#l-valor").value||0) - (+$("#l-transp").value||0)
                - (+$("#l-tecval").value||0) - (+$("#l-motcusto").value||0);
      $("#l-liq").value = BRL(liq);
    };
    ["l-valor","l-transp","l-tecval","l-motcusto"].forEach(id=> $("#"+id).oninput = recalc);
    recalc();

    $("#l-cancel").onclick = closeModal;
    $("#l-save").onclick = async ()=>{
      const eqSel = $("#l-eq").selectedOptions[0];
      const cliSel = $("#l-cli").selectedOptions[0];
      const motSel = $("#l-mot").selectedOptions[0];
      if(!$("#l-data").value) return toast("Informe a data", true);
      if(!$("#l-cli").value)  return toast("Selecione o cliente", true);
      const data = {
        data:$("#l-data").value, horario:$("#l-hora").value.trim(),
        periodo:$("#l-periodo").value.trim(), responsavel:"Vilma",
        clienteId:$("#l-cli").value, cliente: cliSel?cliSel.textContent:"—",
        endereco:$("#l-end").value.trim(),
        equipamentoId:$("#l-eq").value, tecnologia: eqSel?eqSel.dataset.tec:"—", frota: eqSel?eqSel.dataset.frota:"propria",
        tecnica:$("#l-tec").value==="sim", custoTecnica:+$("#l-tecval").value||0,
        motoristaId:$("#l-mot").value, motorista: motSel?motSel.textContent:"—",
        custoTransporte:+$("#l-transp").value||0, motoristaCusto:+$("#l-motcusto").value||0,
        valorCliente:+$("#l-valor").value||0, statusPgto:$("#l-pgto").value
      };
      if(l.id) await Store.update("locacoes", l.id, data); else await Store.add("locacoes", data);
      closeModal(); toast("Locação salva");
    };
  }
}
