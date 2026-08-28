/* ===================================================================
   Módulo: Gestão de Locações
   - Comissão automática do responsável
   - Indisponibilidade do equipamento por horário
   - Custo do fornecedor na sublocação
   - Valor padrão de transporte: R$ 200
   =================================================================== */
import { Store } from "./store.js";
import { $, BRL, fmtData, lucroLiquido, esc, openModal, closeModal, toast } from "./utils.js";
import { calcularComissao } from "./responsaveis.js";

export async function render(view){
  view.innerHTML = `
    <div class="page-head">
      <div><h2>Locações</h2><p class="sub">Agenda, valores e cálculo automático de lucro</p></div>
      <button class="btn btn-primary" id="btn-new">+ Nova locação</button>
    </div>
    <div class="toolbar">
      <div class="search"><input id="search" placeholder="Buscar por cliente, tecnologia, responsável..." /></div>
      <select id="filtro-frota" class="btn btn-ghost">
        <option value="">Toda a frota</option>
        <option value="propria">Frota própria</option>
        <option value="sublocado">Sublocado</option>
      </select>
      <select id="filtro-status" class="btn btn-ghost">
        <option value="">Todos os pagamentos</option>
        <option value="Pago">Pago</option>
        <option value="A Receber">A Receber</option>
      </select>
    </div>
    <div class="panel"><div class="panel-body flush" id="list"></div></div>`;

  const [clientes, equipamentos, motoristas, responsaveis] = await Promise.all([
    Store.list("clientes"), Store.list("equipamentos"),
    Store.list("motoristas"), Store.list("responsaveis")
  ]);

  $("#btn-new").onclick = ()=> form();

  Store.watch("locacoes", lista=>{
    const draw = data=>{
      const ordenada = [...data].sort((a,b)=> b.data.localeCompare(a.data));
      $("#list").innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr>
          <th>Data</th><th>Cliente</th><th>Tecnologia</th><th>Frota</th>
          <th>Responsável</th><th>Motorista</th>
          <th class="text-right">Valor</th><th class="text-right">Líquido</th>
          <th>Pgto</th><th></th>
        </tr></thead><tbody>
        ${ordenada.map(l=>`
          <tr>
            <td class="mono">${fmtData(l.data)}<br><span class="text-muted" style="font-size:11px">${esc(l.horario||"")}</span></td>
            <td><strong>${esc(l.cliente)}</strong></td>
            <td><span class="badge badge-info">${esc(l.tecnologia)}</span></td>
            <td>${l.frota==="sublocado"
              ?'<span class="badge badge-subloc">Sublocado</span>'
              :'<span class="badge badge-frota">Própria</span>'}</td>
            <td>${esc(l.responsavel||"Vilma")}
              ${l.comissaoResponsavel>0?`<br><span style="font-size:11px;color:var(--warn)">Comissão: ${BRL(l.comissaoResponsavel)}</span>`:""}</td>
            <td>${esc(l.motorista||"—")}</td>
            <td class="text-right mono">${BRL(l.valorCliente)}</td>
            <td class="text-right mono"><strong>${BRL(lucroLiquido(l))}</strong></td>
            <td>${l.statusPgto==="Pago"
              ?'<span class="badge badge-ok">Pago</span>'
              :'<span class="badge badge-warn">A receber</span>'}</td>
            <td class="text-right">
              <button class="btn-icon" data-edit="${l.id}">✏️</button>
              <button class="btn-icon" data-del="${l.id}">🗑️</button>
            </td>
          </tr>`).join("") ||
          `<tr><td colspan="10" style="text-align:center;padding:24px" class="text-muted">Nenhuma locação.</td></tr>`}
        </tbody></table></div>`;

      document.querySelectorAll("[data-edit]").forEach(b=>
        b.onclick=()=> form(lista.find(x=>x.id===b.dataset.edit)));
      document.querySelectorAll("[data-del]").forEach(b=>
        b.onclick=async()=>{ if(confirm("Excluir locação?")){ await Store.remove("locacoes",b.dataset.del); toast("Excluída"); }});
    };

    draw(lista);
    const applyFilters = ()=>{
      const q  = $("#search").value.toLowerCase();
      const fr = $("#filtro-frota").value;
      const st = $("#filtro-status").value;
      draw(lista.filter(l =>
        (l.cliente+l.tecnologia+(l.responsavel||"")).toLowerCase().includes(q) &&
        (!fr || l.frota===fr) && (!st || l.statusPgto===st)));
    };
    $("#search").oninput = applyFilters;
    $("#filtro-frota").onchange = applyFilters;
    $("#filtro-status").onchange = applyFilters;
  });

  /* ==================== FORMULÁRIO ==================== */
  function form(l={}){
    const opt = (arr, key, val, txt) =>
      arr.map(o=>`<option value="${o[key]}" ${val===o[key]?"selected":""}>${esc(o[txt])}</option>`).join("");

    const respOpts = responsaveis.map(r=>
      `<option value="${r.id}" data-nome="${esc(r.nome)}" data-tipo="${r.comissaoTipo}" data-val="${r.comissaoValor}" ${l.responsavelId===r.id?"selected":""}>${esc(r.nome)}</option>`
    ).join("");

    const eqOpts = equipamentos.map(e=>
      `<option value="${e.id}" data-tec="${esc(e.tecnologia)}" data-frota="${e.frota}" ${l.equipamentoId===e.id?"selected":""}>${esc(e.modelo)} (${esc(e.serie)})</option>`
    ).join("");

    openModal(l.id?"Editar locação":"Nova locação",`
      <div class="form-grid">
        <div class="field"><label>Data</label>
          <input type="date" id="l-data" value="${l.data||""}"></div>
        <div class="field"><label>Horário</label>
          <input id="l-hora" value="${esc(l.horario||"")}" placeholder="9h às 18h"></div>
        <div class="field"><label>Qtde de horas (período)</label>
          <input id="l-periodo" value="${esc(l.periodo||"")}" placeholder="Ex.: 8h"></div>
        <div class="field"><label>Responsável pela locação</label>
          <select id="l-resp"><option value="">Selecione...</option>${respOpts}</select></div>
        <div class="field full"><label>Comissão do responsável (R$)
          <span style="font-size:11px;color:var(--muted);font-weight:400"> — preenchido automaticamente pelo cadastro</span></label>
          <input type="number" id="l-comissao" value="${l.comissaoResponsavel||0}" style="background:#f1f5f9"></div>
        <div class="field full"><label>Cliente</label>
          <select id="l-cli"><option value="">Selecione...</option>${opt(clientes,"id",l.clienteId,"nome")}</select></div>
        <div class="field full"><label>Endereço da entrega
          <span style="font-size:11px;color:var(--muted);font-weight:400"> — preenchido pelo cadastro do cliente</span></label>
          <input id="l-end" value="${esc(l.endereco||"")}" readonly style="background:#f1f5f9;color:var(--text)"></div>
        <div class="field full"><label>Equipamento</label>
          <select id="l-eq"><option value="">Selecione...</option>${eqOpts}</select></div>
        <div id="aviso-conflito" style="display:none;grid-column:1/-1;background:#fbe4e2;color:#b03028;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:600"></div>
        <div class="field" id="campo-custo-forn" style="display:none">
          <label>Custo do fornecedor (R$) — sublocação</label>
          <input type="number" id="l-forn" value="${l.custoFornecedor||0}"></div>
        <div class="field"><label>Técnica contratada?</label>
          <select id="l-tec">
            <option value="nao" ${!l.tecnica?"selected":""}>Não</option>
            <option value="sim" ${l.tecnica?"selected":""}>Sim</option>
          </select></div>
        <div class="field"><label>Custo da técnica (R$)</label>
          <input type="number" id="l-tecval" value="${l.custoTecnica||0}"></div>
        <div class="field full"><label>Motorista</label>
          <select id="l-mot"><option value="">Selecione...</option>${opt(motoristas,"id",l.motoristaId,"nome")}</select></div>
        <div class="field"><label>Custo transporte (R$)</label>
          <input type="number" id="l-transp" value="${l.custoTransporte??200}"></div>
        <div class="field"><label>Custo pago ao motorista (R$)</label>
          <input type="number" id="l-motcusto" value="${l.motoristaCusto??200}"></div>
        <div class="field"><label>Valor cobrado do cliente (R$)</label>
          <input type="number" id="l-valor" value="${l.valorCliente||0}"></div>
        <div class="field"><label>Status de pagamento</label>
          <select id="l-pgto">
            <option ${l.statusPgto==="A Receber"?"selected":""}>A Receber</option>
            <option ${l.statusPgto==="Pago"?"selected":""}>Pago</option>
          </select></div>
        <div class="field full">
          <label>Lucro líquido (calculado automaticamente)</label>
          <input id="l-liq" readonly style="background:#f1f5f9;font-weight:700;font-size:16px" value="R$ 0,00">
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" id="l-cancel">Cancelar</button>
          <button class="btn btn-primary" id="l-save">Salvar</button>
        </div>
      </div>`);

    // Responsável → preenche comissão automaticamente
    $("#l-resp").onchange = ()=>{
      const sel = $("#l-resp").selectedOptions[0];
      if(!sel||!sel.value) return;
      const tipo = sel.dataset.tipo;
      const val  = +sel.dataset.val||0;
      const valorLoc = +$("#l-valor").value||0;
      let comissao = 0;
      if(tipo==="fixo")    comissao = val;
      if(tipo==="percent") comissao = val/100 * valorLoc;
      $("#l-comissao").value = comissao.toFixed(2);
      recalc();
    };

    // Cliente → preenche endereço automaticamente
    $("#l-cli").onchange = ()=>{
      const cliId = $("#l-cli").value;
      const cli = clientes.find(c=>c.id===cliId);
      $("#l-end").value = cli ? (cli.endComercial||cli.endResidencial||"") : "";
    };
    if(l.clienteId && !l.endereco){
      const cli = clientes.find(c=>c.id===l.clienteId);
      if(cli) $("#l-end").value = cli.endComercial||cli.endResidencial||"";
    }

    // Equipamento → mostra campo de custo do fornecedor se sublocado + verifica conflito
    const verificarConflito = async()=>{
      const eqSel = $("#l-eq").selectedOptions[0];
      if(!eqSel||!eqSel.value) return;

      // campo custo fornecedor
      const frota = eqSel.dataset.frota;
      document.getElementById("campo-custo-forn").style.display = frota==="sublocado"?"":"none";

      // verificação de conflito de horário
      const data = $("#l-data").value;
      const hor  = $("#l-hora").value;
      if(!data||!hor) return;

      const todasLoc = await Store.list("locacoes");
      const conflito = todasLoc.find(x=>
        x.equipamentoId===eqSel.value &&
        x.data===data &&
        x.id !== (l.id||"") &&
        x.horario // só verifica se tem horário
      );

      const aviso = document.getElementById("aviso-conflito");
      if(conflito){
        aviso.style.display="";
        aviso.textContent = `⚠️ Equipamento já alocado nesta data para ${conflito.cliente} (${conflito.horario}). Confirme o horário antes de salvar.`;
      } else {
        aviso.style.display="none";
      }
      recalc();
    };

    $("#l-eq").onchange = verificarConflito;
    $("#l-data").onchange = verificarConflito;
    $("#l-hora").oninput  = verificarConflito;

    // Recálculo do lucro
    const recalc = ()=>{
      const val    = +$("#l-valor").value||0;
      const transp = +$("#l-transp").value||0;
      const tec    = +$("#l-tecval").value||0;
      const mot    = +$("#l-motcusto").value||0;
      const comis  = +$("#l-comissao").value||0;
      const forn   = +$("#l-forn")?.value||0;
      const liq = val - transp - tec - mot - comis - forn;
      $("#l-liq").value = BRL(liq);
      $("#l-liq").style.color = liq>=0?"var(--ok)":"var(--danger)";
    };

    ["l-valor","l-transp","l-tecval","l-motcusto","l-comissao","l-forn"].forEach(id=>{
      const el = $(  "#"+id); if(el) el.oninput = recalc;
    });
    recalc();

    // Inicializa campo de fornecedor se editando sublocado
    if(l.frota==="sublocado") document.getElementById("campo-custo-forn").style.display="";

    $("#l-cancel").onclick = closeModal;
    $("#l-save").onclick = async()=>{
      const eqSel  = $("#l-eq").selectedOptions[0];
      const cliSel = $("#l-cli").selectedOptions[0];
      const motSel = $("#l-mot").selectedOptions[0];
      const respSel= $("#l-resp").selectedOptions[0];

      if(!$("#l-data").value) return toast("Informe a data",true);
      if(!$("#l-cli").value)  return toast("Selecione o cliente",true);

      const data = {
        data:       $("#l-data").value,
        horario:    $("#l-hora").value.trim(),
        periodo:    $("#l-periodo").value.trim(),
        responsavelId: $("#l-resp").value,
        responsavel:   respSel ? respSel.textContent : "Vilma",
        comissaoResponsavel: +$("#l-comissao").value||0,
        clienteId:  $("#l-cli").value,
        cliente:    cliSel ? cliSel.textContent : "—",
        endereco:   $("#l-end").value.trim(),
        equipamentoId: $("#l-eq").value,
        tecnologia: eqSel ? eqSel.dataset.tec : "—",
        frota:      eqSel ? eqSel.dataset.frota : "propria",
        custoFornecedor: +$("#l-forn")?.value||0,
        tecnica:    $("#l-tec").value==="sim",
        custoTecnica: +$("#l-tecval").value||0,
        motoristaId: $("#l-mot").value,
        motorista:  motSel ? motSel.textContent : "—",
        custoTransporte: +$("#l-transp").value||0,
        motoristaCusto:  +$("#l-motcusto").value||0,
        valorCliente:    +$("#l-valor").value||0,
        statusPgto: $("#l-pgto").value
      };

      if(l.id) await Store.update("locacoes",l.id,data);
      else     await Store.add("locacoes",data);
      closeModal(); toast("Locação salva");
    };
  }
}
