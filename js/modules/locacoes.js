/* ===================================================================
   Módulo: Gestão de Locações
   - Busca de cliente por nome (campo com filtro ao digitar)
   - Sem campo "custo transporte" — apenas custo motorista
   - Comissão automática do responsável
   - Indisponibilidade do equipamento por horário
   - Custo do fornecedor na sublocação
   =================================================================== */
import { Store } from "./store.js";
import { $, BRL, fmtData, lucroLiquido, esc, openModal, closeModal, toast } from "./utils.js";

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

  // Ordena clientes A→Z para o select de busca
  const clientesOrd = [...clientes].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));

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
            <td>${esc(l.responsavel||"Vilma")}</td>
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

    // Cliente selecionado atual (para exibir no campo de busca ao editar)
    const cliAtual = clientesOrd.find(c=>c.id===l.clienteId);

    openModal(l.id?"Editar locação":"Nova locação",`
      <div class="form-grid">
        <div class="field"><label>Data</label>
          <input type="date" id="l-data" value="${l.data||""}"></div>
        <div class="field"><label>Horário</label>
          <input id="l-hora" value="${esc(l.horario||"")}" placeholder="9h às 18h"></div>
        <div class="field"><label>Período (horas)</label>
          <input id="l-periodo" value="${esc(l.periodo||"")}" placeholder="Ex.: 8h"></div>
        <div class="field"><label>Responsável pela locação</label>
          <select id="l-resp"><option value="">Selecione...</option>${respOpts}</select></div>
        <div class="field full"><label>Comissão do responsável (R$)
          <span style="font-size:11px;color:var(--muted);font-weight:400"> — preenchido automaticamente</span></label>
          <input type="number" id="l-comissao" value="${l.comissaoResponsavel||0}" style="background:#f1f5f9"></div>

        <!-- BUSCA DE CLIENTE POR NOME -->
        <div class="field full">
          <label>Cliente
            <span style="font-size:11px;color:var(--muted);font-weight:400"> — digite para filtrar</span>
          </label>
          <div style="position:relative">
            <input id="l-cli-busca" autocomplete="off"
              value="${esc(cliAtual?.nome || l.cliente || "")}"
              placeholder="Digite o nome do cliente..."
              style="width:100%;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;font-size:14px">
            <input type="hidden" id="l-cli" value="${l.clienteId||""}">
            <div id="l-cli-lista" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:200;
              background:#fff;border:1.5px solid var(--brand);border-top:none;border-radius:0 0 10px 10px;
              max-height:220px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.12)">
            </div>
          </div>
        </div>

        <div class="field full"><label>Endereço da entrega
          <span style="font-size:11px;color:var(--muted);font-weight:400"> — preenchido pelo cliente</span></label>
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

    /* ---- Busca de cliente por nome ---- */
    const inputBusca = $("#l-cli-busca");
    const inputId    = $("#l-cli");
    const listaCli   = $("#l-cli-lista");

    function renderListaClientes(filtro=""){
      const q = filtro.toLowerCase().trim();
      const encontrados = q
        ? clientesOrd.filter(c=>(c.nome||"").toLowerCase().includes(q))
        : clientesOrd;

      if(!encontrados.length){
        listaCli.innerHTML = `<div style="padding:12px;color:#64748b;font-size:13px">Nenhum cliente encontrado</div>`;
      } else {
        listaCli.innerHTML = encontrados.map(c=>`
          <div data-cli-id="${c.id}" data-cli-nome="${esc(c.nome)}"
            style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f1f5f9"
            onmouseover="this.style.background='#f0f7ff'" onmouseout="this.style.background=''">
            <strong>${esc(c.nome)}</strong>
            ${c.endComercial?`<br><span style="font-size:11px;color:#64748b">${esc(c.endComercial)}</span>`:""}
          </div>`).join("");

        listaCli.querySelectorAll("[data-cli-id]").forEach(item=>{
          item.onmousedown = e=>{
            e.preventDefault();
            const cli = clientesOrd.find(c=>c.id===item.dataset.cliId);
            inputId.value    = cli.id;
            inputBusca.value = cli.nome;
            listaCli.style.display = "none";
            // preenche endereço
            $("#l-end").value = cli.endComercial||cli.endResidencial||"";
            recalc();
          };
        });
      }
      listaCli.style.display = "";
    }

    inputBusca.oninput  = ()=> renderListaClientes(inputBusca.value);
    inputBusca.onfocus  = ()=> renderListaClientes(inputBusca.value);
    inputBusca.onblur   = ()=> setTimeout(()=>{ listaCli.style.display="none"; }, 200);

    // Se editando — preenche endereço do cliente já selecionado
    if(l.clienteId){
      const cli = clientesOrd.find(c=>c.id===l.clienteId);
      if(cli && !$("#l-end").value)
        $("#l-end").value = cli.endComercial||cli.endResidencial||"";
    }

    /* ---- Responsável → comissão automática ---- */
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

    /* ---- Equipamento → conflito + custo fornecedor ---- */
    const verificarConflito = async()=>{
      const eqSel = $("#l-eq").selectedOptions[0];
      if(!eqSel||!eqSel.value) return;
      document.getElementById("campo-custo-forn").style.display =
        eqSel.dataset.frota==="sublocado" ? "" : "none";
      const data = $("#l-data").value;
      const hor  = $("#l-hora").value;
      if(!data||!hor) return;
      const todasLoc = await Store.list("locacoes");
      const conflito = todasLoc.find(x=>
        x.equipamentoId===eqSel.value && x.data===data &&
        x.id!==(l.id||"") && x.horario);
      const aviso = document.getElementById("aviso-conflito");
      if(conflito){
        aviso.style.display="";
        aviso.textContent=`⚠️ Equipamento já alocado nesta data para ${conflito.cliente} (${conflito.horario}).`;
      } else {
        aviso.style.display="none";
      }
      recalc();
    };
    $("#l-eq").onchange   = verificarConflito;
    $("#l-data").onchange = verificarConflito;
    $("#l-hora").oninput  = verificarConflito;

    /* ---- Recálculo do lucro (sem custoTransporte) ---- */
    const recalc = ()=>{
      const val   = +$("#l-valor").value||0;
      const tec   = +$("#l-tecval").value||0;
      const mot   = +$("#l-motcusto").value||0;
      const comis = +$("#l-comissao").value||0;
      const forn  = +$("#l-forn")?.value||0;
      const liq   = val - tec - mot - comis - forn;
      $("#l-liq").value = BRL(liq);
      $("#l-liq").style.color = liq>=0?"var(--ok)":"var(--danger)";
    };
    ["l-valor","l-tecval","l-motcusto","l-comissao","l-forn"].forEach(id=>{
      const el = $("#"+id); if(el) el.oninput = recalc;
    });
    recalc();

    if(l.frota==="sublocado") document.getElementById("campo-custo-forn").style.display="";

    $("#l-cancel").onclick = closeModal;
    $("#l-save").onclick = async()=>{
      const eqSel  = $("#l-eq").selectedOptions[0];
      const motSel = $("#l-mot").selectedOptions[0];
      const respSel= $("#l-resp").selectedOptions[0];
      const cliId  = $("#l-cli").value;
      const cliObj = clientesOrd.find(c=>c.id===cliId);

      if(!$("#l-data").value) return toast("Informe a data",true);
      if(!cliId)              return toast("Selecione o cliente",true);

      const data = {
        data:       $("#l-data").value,
        horario:    $("#l-hora").value.trim(),
        periodo:    $("#l-periodo").value.trim(),
        responsavelId:       $("#l-resp").value,
        responsavel:         respSel?.value ? respSel.textContent : "Vilma",
        comissaoResponsavel: +$("#l-comissao").value||0,
        clienteId:  cliId,
        cliente:    cliObj?.nome || inputBusca.value.trim() || "—",
        endereco:   $("#l-end").value.trim(),
        equipamentoId: $("#l-eq").value,
        tecnologia: eqSel ? eqSel.dataset.tec : "—",
        frota:      eqSel ? eqSel.dataset.frota : "propria",
        custoFornecedor: +$("#l-forn")?.value||0,
        tecnica:    $("#l-tec").value==="sim",
        custoTecnica: +$("#l-tecval").value||0,
        motoristaId: $("#l-mot").value,
        motorista:  motSel?.value ? motSel.textContent : "—",
        custoTransporte: 0,
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
