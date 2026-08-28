/* Módulo: Controle Financeiro =================================== */
import { Store } from "./store.js";
import { $, $$, BRL, fmtData, lucroLiquido, esc, openModal, closeModal, toast } from "./utils.js";

export async function render(view){
  view.innerHTML = `
    <div class="page-head">
      <div><h2>Financeiro</h2><p class="sub">Receitas, despesas e margem de lucro</p></div>
      <button class="btn btn-primary" id="btn-desp">+ Nova despesa</button>
    </div>
    <div class="cards-grid" id="fin-cards"></div>

    <div class="panel">
      <div class="panel-head"><h3>Receitas por locação</h3></div>
      <div class="panel-body flush"><div id="fin-receitas"></div></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Despesas</h3></div>
      <div class="panel-body flush"><div id="fin-despesas"></div></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Inadimplência — A receber</h3></div>
      <div class="panel-body flush"><div id="fin-inadimplencia"></div></div>
    </div>`;

  $("#btn-desp").onclick = ()=> formDespesa();

  /* Receitas + cards (reagem a locações) */
  Store.watch("locacoes", locacoes=>{
    const receita = locacoes.reduce((s,l)=> s+(+l.valorCliente||0),0);
    const lucro   = locacoes.reduce((s,l)=> s+lucroLiquido(l),0);
    const aReceber= locacoes.filter(l=>l.statusPgto==="A Receber").reduce((s,l)=> s+(+l.valorCliente||0),0);
    const margem  = receita ? (lucro/receita*100) : 0;

    $("#fin-cards").innerHTML = `
      <div class="stat-card"><div class="label">Receita</div><div class="value pos">${BRL(receita)}</div><div class="bar" style="background:var(--ok)"></div></div>
      <div class="stat-card"><div class="label">Lucro líquido</div><div class="value">${BRL(lucro)}</div><div class="bar" style="background:var(--brand)"></div></div>
      <div class="stat-card"><div class="label">Margem média</div><div class="value">${margem.toFixed(1)}%</div><div class="bar" style="background:var(--accent)"></div></div>
      <div class="stat-card"><div class="label">A receber</div><div class="value neg">${BRL(aReceber)}</div><div class="bar" style="background:var(--warn)"></div></div>`;

    $("#fin-receitas").innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Data</th><th>Cliente</th><th>Tecnologia</th><th class="text-right">Valor</th><th class="text-right">Lucro</th><th class="text-right">Margem</th><th>Status</th></tr></thead>
      <tbody>${[...locacoes].sort((a,b)=>b.data.localeCompare(a.data)).map(l=>{
        const liq=lucroLiquido(l); const mg=l.valorCliente?(liq/l.valorCliente*100):0;
        return `<tr>
          <td class="mono">${fmtData(l.data)}</td><td>${esc(l.cliente)}</td>
          <td><span class="badge badge-info">${esc(l.tecnologia)}</span></td>
          <td class="text-right mono">${BRL(l.valorCliente)}</td>
          <td class="text-right mono">${BRL(liq)}</td>
          <td class="text-right mono">${mg.toFixed(0)}%</td>
          <td>${l.statusPgto==="Pago"
            ?'<span class="badge badge-ok">Pago</span>'
            :`<button class="btn btn-ghost btn-sm" data-pay="${l.id}">Marcar pago</button>`}</td>
        </tr>`;}).join("")}</tbody></table></div>`;

    // Inadimplência
    const inad = locacoes.filter(l=>l.statusPgto==="A Receber");
    $("#fin-inadimplencia").innerHTML = inad.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Data</th><th>Cliente</th><th class="text-right">Valor</th><th></th></tr></thead>
      <tbody>${inad.map(l=>`<tr>
        <td class="mono">${fmtData(l.data)}</td><td>${esc(l.cliente)}</td>
        <td class="text-right mono"><span class="badge badge-danger">${BRL(l.valorCliente)}</span></td>
        <td class="text-right"><button class="btn btn-primary btn-sm" data-pay="${l.id}">Registrar pagamento</button></td>
      </tr>`).join("")}</tbody></table></div>`
      : `<div class="panel-body text-muted" style="text-align:center">Nenhuma pendência 🎉</div>`;

    $$("[data-pay]").forEach(b=> b.onclick=async()=>{ await Store.update("locacoes",b.dataset.pay,{statusPgto:"Pago"}); toast("Pagamento registrado"); });
  });

  /* Despesas */
  Store.watch("despesas", lista=>{
    const total = lista.reduce((s,d)=> s+(+d.valor||0),0);
    $("#fin-despesas").innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Descrição</th><th>Tipo</th><th>Vencimento</th><th class="text-right">Valor</th><th></th></tr></thead>
      <tbody>${lista.map(d=>`<tr>
        <td><strong>${esc(d.descricao)}</strong></td>
        <td><span class="badge ${d.tipo==="Fixa"?"badge-info":"badge-muted"}">${esc(d.tipo)}</span></td>
        <td class="mono">${fmtData(d.venc)}</td>
        <td class="text-right mono">${BRL(d.valor)}</td>
        <td class="text-right"><button class="btn-icon" data-edit="${d.id}">✏️</button><button class="btn-icon" data-del="${d.id}">🗑️</button></td>
      </tr>`).join("")}
      <tr><td colspan="3" class="text-right"><strong>Total</strong></td><td class="text-right mono"><strong>${BRL(total)}</strong></td><td></td></tr>
      </tbody></table></div>`;
    $$("[data-edit]").forEach(b=> b.onclick=()=> formDespesa(lista.find(x=>x.id===b.dataset.edit)));
    $$("[data-del]").forEach(b=> b.onclick=async()=>{ if(confirm("Excluir despesa?")){ await Store.remove("despesas",b.dataset.del); toast("Excluída"); }});
  });

  function formDespesa(d={}){
    openModal(d.id?"Editar despesa":"Nova despesa",`
      <div class="form-grid">
        <div class="field full"><label>Descrição</label><input id="d-desc" value="${esc(d.descricao||"")}"></div>
        <div class="field"><label>Tipo</label>
          <select id="d-tipo"><option ${d.tipo==="Fixa"?"selected":""}>Fixa</option><option ${d.tipo==="Avulsa"?"selected":""}>Avulsa</option></select></div>
        <div class="field"><label>Valor (R$)</label><input type="number" id="d-valor" value="${d.valor||0}"></div>
        <div class="field"><label>Vencimento</label><input type="date" id="d-venc" value="${d.venc||""}"></div>
        <div class="form-actions"><button class="btn btn-ghost" id="d-cancel">Cancelar</button>
        <button class="btn btn-primary" id="d-save">Salvar</button></div>
      </div>`);
    $("#d-cancel").onclick=closeModal;
    $("#d-save").onclick=async()=>{
      const data={descricao:$("#d-desc").value.trim(),tipo:$("#d-tipo").value,valor:+$("#d-valor").value||0,venc:$("#d-venc").value};
      if(!data.descricao) return toast("Informe a descrição",true);
      if(d.id) await Store.update("despesas",d.id,data); else await Store.add("despesas",data);
      closeModal(); toast("Despesa salva");
    };
  }
}
