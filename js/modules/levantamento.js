/* ===================================================================
   Módulo: Levantamento (Entradas × Saídas)
   - Filtro de período dinâmico (início / fim) via calendário
   - Dashboard de custo, receita, lucro e margem
   - Gráfico: comparativo mensal (receita × custo × lucro) estilo BI
   - Gráfico: clientes com maior receita no período
   - Gráfico: maiores custos (motoristas, sublocação, técnica, despesas…)
   - Exportação em PDF (jsPDF + autoTable)
   =================================================================== */
import { Store } from "./store.js";
import { BRL, fmtData, esc, toast } from "./utils.js";

/* Decompõe os custos de uma locação por categoria */
function custosLocacao(l){
  return {
    Motoristas:  Number(l.motoristaCusto)||0,
    Transporte:  Number(l.custoTransporte)||0,
    Sublocação:  Number(l.custoFornecedor)||0,
    Técnica:     Number(l.custoTecnica)||0,
    Comissões:   Number(l.comissaoResponsavel)||0
  };
}
/* Evita contar transporte em dobro quando já embutido no custo do motorista */
function custosLocacaoAjustado(l){
  const c = custosLocacao(l);
  const t = Number(l.custoTransporte)||0, m = Number(l.motoristaCusto)||0;
  if(t && m && t === m) c.Transporte = 0;
  return c;
}

const CORES = {
  Motoristas:"#0d4f8b", Transporte:"#1c9bd8", Sublocação:"#a9760a",
  Técnica:"#7c3aed", Comissões:"#0f766e", Despesas:"#d6453d"
};
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/* Barra horizontal (ranking) */
function barras(itens, corFn, fmt=BRL){
  const max = Math.max(1, ...itens.map(i=>i.valor));
  if(!itens.length) return `<div class="panel-body text-muted" style="text-align:center">Sem dados no período.</div>`;
  return `<div style="display:flex;flex-direction:column;gap:12px;padding:16px 18px">
    ${itens.map(i=>{
      const pct = Math.max(2, i.valor/max*100);
      return `<div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="font-weight:600;color:var(--brand-navy)">${esc(i.label)}</span>
          <span class="mono" style="color:var(--muted)">${fmt(i.valor)}</span>
        </div>
        <div style="height:14px;background:#eef2f7;border-radius:7px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${corFn(i)};border-radius:7px;transition:width .4s"></div>
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

/* Gráfico comparativo mensal — SVG estilo BI: barras (receita/custo) + linha (lucro) */
function graficoMensal(meses){
  if(!meses.length) return `<div class="panel-body text-muted" style="text-align:center">Sem dados no período.</div>`;
  const W=Math.max(560, meses.length*96), H=320, P={t:24,r:24,b:56,l:64};
  const iw=W-P.l-P.r, ih=H-P.t-P.b;
  const maxV=Math.max(1, ...meses.map(m=>Math.max(m.receita, m.custo)));
  const maxLucro=Math.max(...meses.map(m=>Math.abs(m.lucro)),1);
  const escala=maxLucro>maxV?maxLucro:maxV;
  const y = v => P.t + ih - (v/escala)*ih;
  const y0 = y(0);
  const step = iw/meses.length;
  const bw = Math.min(26, step/3.2);

  // grid + eixo Y (5 linhas)
  let grid="";
  for(let i=0;i<=4;i++){
    const val=escala*i/4, gy=y(val);
    grid+=`<line x1="${P.l}" y1="${gy}" x2="${W-P.r}" y2="${gy}" stroke="#eef2f7" stroke-width="1"/>
      <text x="${P.l-8}" y="${gy+4}" text-anchor="end" font-size="10" fill="#94a3b8">${(val/1000).toFixed(0)}k</text>`;
  }

  let barsHtml="", linePts=[], dots="", labels="";
  meses.forEach((m,i)=>{
    const cx=P.l+step*i+step/2;
    const xR=cx-bw-2, xC=cx+2;
    const hR=y0-y(m.receita), hC=y0-y(m.custo);
    barsHtml+=`
      <rect x="${xR}" y="${y(m.receita)}" width="${bw}" height="${Math.max(0,hR)}" rx="3" fill="#1e9e6a"><title>Receita ${BRL(m.receita)}</title></rect>
      <rect x="${xC}" y="${y(m.custo)}" width="${bw}" height="${Math.max(0,hC)}" rx="3" fill="#d6453d"><title>Custo ${BRL(m.custo)}</title></rect>`;
    const ly=y(m.lucro);
    linePts.push(`${cx},${ly}`);
    dots+=`<circle cx="${cx}" cy="${ly}" r="4" fill="#0d4f8b" stroke="#fff" stroke-width="2"><title>Lucro ${BRL(m.lucro)}</title></circle>`;
    labels+=`<text x="${cx}" y="${H-P.b+18}" text-anchor="middle" font-size="11" fill="#475569" font-weight="600">${m.label}</text>`;
  });

  return `<div style="padding:16px 18px;overflow-x:auto">
    <div style="display:flex;gap:18px;margin-bottom:10px;font-size:12px;color:var(--muted);flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:6px"><i style="width:12px;height:12px;background:#1e9e6a;border-radius:3px;display:inline-block"></i>Receita</span>
      <span style="display:flex;align-items:center;gap:6px"><i style="width:12px;height:12px;background:#d6453d;border-radius:3px;display:inline-block"></i>Custo</span>
      <span style="display:flex;align-items:center;gap:6px"><i style="width:16px;height:3px;background:#0d4f8b;display:inline-block"></i>Lucro</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;font-family:inherit">
      ${grid}
      <line x1="${P.l}" y1="${y0}" x2="${W-P.r}" y2="${y0}" stroke="#cbd5e1" stroke-width="1"/>
      ${barsHtml}
      <polyline points="${linePts.join(" ")}" fill="none" stroke="#0d4f8b" stroke-width="2.5" stroke-linejoin="round"/>
      ${dots}${labels}
    </svg>
  </div>`;
}

/* Agrupa locações + despesas por mês (YYYY-MM) */
function agruparMensal(locPeriodo, despPeriodo){
  const mapa={};
  const get=k=>(mapa[k] ||= {receita:0,custo:0});
  locPeriodo.forEach(l=>{
    if(!l.data) return;
    const k=l.data.slice(0,7), o=get(k);
    o.receita += Number(l.valorCliente)||0;
    const c=custosLocacaoAjustado(l);
    o.custo += Object.values(c).reduce((a,b)=>a+b,0);
  });
  despPeriodo.forEach(d=>{
    if(!d.venc) return;
    get(d.venc.slice(0,7)).custo += Number(d.valor)||0;
  });
  return Object.entries(mapa).sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>{
    const [y,m]=k.split("-");
    return { key:k, label:`${MESES[+m-1]}/${y.slice(2)}`, receita:v.receita, custo:v.custo, lucro:v.receita-v.custo };
  });
}

export async function render(view){
  const [locacoes, despesas] = await Promise.all([
    Store.list("locacoes"), Store.list("despesas")
  ]);

  const datas = locacoes.map(l=>l.data).filter(Boolean).sort();
  const hoje = new Date().toISOString().slice(0,10);
  const ini0 = datas[0] || hoje.slice(0,8)+"01";
  const fim0 = datas[datas.length-1] || hoje;

  view.innerHTML = `
    <div class="page-head">
      <div><h2>Levantamento</h2><p class="sub">Entradas × saídas, custos e lucros por período</p></div>
      <button class="btn btn-danger" id="lev-pdf">📄 Exportar PDF</button>
    </div>

    <div class="panel" style="margin-bottom:18px">
      <div class="panel-body" style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap">
        <div class="field" style="margin:0">
          <label>Início do período</label>
          <input type="date" id="lev-ini" value="${ini0}">
        </div>
        <div class="field" style="margin:0">
          <label>Fim do período</label>
          <input type="date" id="lev-fim" value="${fim0}">
        </div>
        <button class="btn btn-primary" id="lev-aplicar">Aplicar</button>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-left:auto">
          <button class="btn btn-ghost btn-sm" data-atalho="mes">Mês atual</button>
          <button class="btn btn-ghost btn-sm" data-atalho="30d">Últimos 30 dias</button>
          <button class="btn btn-ghost btn-sm" data-atalho="ano">Ano</button>
          <button class="btn btn-ghost btn-sm" data-atalho="tudo">Tudo</button>
        </div>
      </div>
    </div>

    <div class="cards-grid" id="lev-cards"></div>

    <div class="panel">
      <div class="panel-head"><h3>Comparativo mensal — Receita × Custo × Lucro</h3></div>
      <div class="panel-body flush"><div id="lev-mensal"></div></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Clientes com maior receita no período</h3></div>
      <div class="panel-body flush"><div id="lev-clientes"></div></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Maiores custos no período</h3></div>
      <div class="panel-body flush"><div id="lev-custos"></div></div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Entradas × Saídas (detalhe)</h3></div>
      <div class="panel-body flush"><div id="lev-detalhe"></div></div>
    </div>`;

  const $ini = view.querySelector("#lev-ini");
  const $fim = view.querySelector("#lev-fim");
  let ultimo = null; // guarda snapshot p/ o PDF

  function calcular(){
    let ini = $ini.value, fim = $fim.value;
    if(ini && fim && ini > fim){ [ini,fim] = [fim,ini]; $ini.value=ini; $fim.value=fim; }
    const dentro = d => (!ini || d >= ini) && (!fim || d <= fim);

    const locPeriodo  = locacoes.filter(l => dentro(l.data));
    const despPeriodo = despesas.filter(d => dentro(d.venc));

    const receita  = locPeriodo.reduce((s,l)=> s+(Number(l.valorCliente)||0), 0);
    const recebido = locPeriodo.filter(l=>l.statusPgto==="Pago").reduce((s,l)=> s+(Number(l.valorCliente)||0), 0);
    const aReceber = receita - recebido;

    const custoCat = { Motoristas:0, Transporte:0, Sublocação:0, Técnica:0, Comissões:0, Despesas:0 };
    locPeriodo.forEach(l=>{ const c=custosLocacaoAjustado(l); for(const k in c) custoCat[k]+=c[k]; });
    custoCat.Despesas = despPeriodo.reduce((s,d)=> s+(Number(d.valor)||0), 0);

    const custoTotal = Object.values(custoCat).reduce((a,b)=>a+b,0);
    const lucro  = receita - custoTotal;
    const margem = receita ? (lucro/receita*100) : 0;

    view.querySelector("#lev-cards").innerHTML = `
      <div class="stat-card"><div class="label">Entradas (receita)</div><div class="value pos">${BRL(receita)}</div><div class="trend">${locPeriodo.length} locações · ${BRL(recebido)} recebido</div><div class="bar" style="background:var(--ok)"></div></div>
      <div class="stat-card"><div class="label">Saídas (custos)</div><div class="value neg">${BRL(custoTotal)}</div><div class="trend">Locações + despesas</div><div class="bar" style="background:var(--danger)"></div></div>
      <div class="stat-card"><div class="label">Lucro do período</div><div class="value ${lucro>=0?"pos":"neg"}">${BRL(lucro)}</div><div class="trend">Entradas − saídas</div><div class="bar" style="background:var(--brand)"></div></div>
      <div class="stat-card"><div class="label">Margem</div><div class="value">${margem.toFixed(1)}%</div><div class="trend">Sobre a receita</div><div class="bar" style="background:var(--accent)"></div></div>
      <div class="stat-card"><div class="label">A receber</div><div class="value neg">${BRL(aReceber)}</div><div class="trend">Ainda em aberto</div><div class="bar" style="background:var(--warn)"></div></div>`;

    // Comparativo mensal
    const meses = agruparMensal(locPeriodo, despPeriodo);
    view.querySelector("#lev-mensal").innerHTML = graficoMensal(meses);

    // Clientes por receita
    const porCliente = {};
    locPeriodo.forEach(l=>{ const n=l.cliente||"—"; porCliente[n]=(porCliente[n]||0)+(Number(l.valorCliente)||0); });
    const clientesRank = Object.entries(porCliente).map(([label,valor])=>({label,valor})).sort((a,b)=>b.valor-a.valor).slice(0,10);
    view.querySelector("#lev-clientes").innerHTML = barras(clientesRank, ()=>"var(--brand)");

    // Custos por categoria
    const custosRank = Object.entries(custoCat).map(([label,valor])=>({label,valor})).filter(i=>i.valor>0).sort((a,b)=>b.valor-a.valor);
    view.querySelector("#lev-custos").innerHTML = barras(custosRank, i=>CORES[i.label]||"var(--danger)");

    // Detalhe
    const linhas = [...locPeriodo].sort((a,b)=>b.data.localeCompare(a.data));
    view.querySelector("#lev-detalhe").innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Data</th><th>Cliente</th><th>Tecnologia</th>
        <th class="text-right">Entrada</th><th class="text-right">Saída</th>
        <th class="text-right">Resultado</th><th>Status</th></tr></thead>
      <tbody>${linhas.map(l=>{
        const c=custosLocacaoAjustado(l); const saida=Object.values(c).reduce((a,b)=>a+b,0);
        const ent=Number(l.valorCliente)||0; const res=ent-saida;
        return `<tr>
          <td class="mono">${fmtData(l.data)}</td><td>${esc(l.cliente)}</td>
          <td><span class="badge badge-info">${esc(l.tecnologia)}</span></td>
          <td class="text-right mono" style="color:var(--ok)">${BRL(ent)}</td>
          <td class="text-right mono" style="color:var(--danger)">${BRL(saida)}</td>
          <td class="text-right mono"><strong>${BRL(res)}</strong></td>
          <td>${l.statusPgto==="Pago"?'<span class="badge badge-ok">Pago</span>':'<span class="badge badge-warn">A receber</span>'}</td>
        </tr>`;}).join("")}
        <tr>
          <td colspan="3" class="text-right"><strong>Totais</strong></td>
          <td class="text-right mono" style="color:var(--ok)"><strong>${BRL(receita)}</strong></td>
          <td class="text-right mono" style="color:var(--danger)"><strong>${BRL(custoTotal-custoCat.Despesas)}</strong></td>
          <td class="text-right mono"><strong>${BRL(lucro+custoCat.Despesas)}</strong></td>
          <td></td>
        </tr>
      </tbody></table></div>
      ${despPeriodo.length?`<div style="padding:12px 18px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)">
        + Despesas do período (vencimento): <strong style="color:var(--danger)">${BRL(custoCat.Despesas)}</strong></div>`:""}`;

    ultimo = { ini, fim, receita, recebido, aReceber, custoCat, custoTotal, lucro, margem, meses, clientesRank, custosRank, linhas };
  }

  /* ---------------- Exportação PDF ---------------- */
  async function exportarPDF(){
    if(!ultimo) return;
    const btn = view.querySelector("#lev-pdf");
    const txt = btn.textContent; btn.disabled=true; btn.textContent="Gerando...";
    try{
      const { jsPDF } = await import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm");
      const autoTableMod = await import("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/+esm");
      const d = ultimo;
      const doc = new jsPDF({ unit:"pt", format:"a4" });

      // Resolve o autoTable independentemente de como o CDN o expõe:
      // (1) método já anexado ao doc (plugin clássico)
      // (2) export default   (3) export nomeado  (4) função no módulo
      const atFn = (typeof autoTableMod.default === "function") ? autoTableMod.default
                 : (typeof autoTableMod.autoTable === "function") ? autoTableMod.autoTable
                 : null;
      const runTable = (options) => {
        if (typeof doc.autoTable === "function") doc.autoTable(options);
        else if (atFn) atFn(doc, options);
        else throw new Error("Plugin autoTable não carregou. Verifique a conexão.");
        // finalY pode estar em doc.lastAutoTable (plugin) ou em options (função)
        return (doc.lastAutoTable && doc.lastAutoTable.finalY)
            || (options.lastAutoTable && options.lastAutoTable.finalY)
            || options.startY + 40;
      };

      const pw = doc.internal.pageSize.getWidth();
      const brl = v => "R$ " + (Number(v)||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});

      // Cabeçalho
      doc.setFillColor(13,79,139); doc.rect(0,0,pw,70,"F");
      doc.setTextColor(255); doc.setFont("helvetica","bold"); doc.setFontSize(18);
      doc.text("Levantamento Financeiro", 40, 32);
      doc.setFont("helvetica","normal"); doc.setFontSize(10);
      const per = `Período: ${d.ini?fmtData(d.ini):"—"} a ${d.fim?fmtData(d.fim):"—"}`;
      doc.text(per, 40, 50);
      doc.text("MedConnect · Gestão de Locações", pw-40, 50, {align:"right"});

      let yy = 96;
      // Resumo (cards)
      const resumo = [
        ["Entradas (receita)", brl(d.receita)],
        ["Saídas (custos)",   brl(d.custoTotal)],
        ["Lucro do período",  brl(d.lucro)],
        ["Margem",            d.margem.toFixed(1)+"%"],
        ["A receber",         brl(d.aReceber)]
      ];
      const cw=(pw-80)/resumo.length;
      resumo.forEach((r,i)=>{
        const x=40+cw*i;
        doc.setDrawColor(226,232,240); doc.setFillColor(248,250,252);
        doc.roundedRect(x,yy,cw-8,54,4,4,"FD");
        doc.setTextColor(100,116,139); doc.setFontSize(7.5); doc.setFont("helvetica","bold");
        doc.text(r[0].toUpperCase(), x+8, yy+16);
        doc.setTextColor(18,36,63); doc.setFontSize(12);
        doc.text(r[1], x+8, yy+38);
      });
      yy += 78;

      // Comparativo mensal (tabela)
      doc.setTextColor(18,36,63); doc.setFont("helvetica","bold"); doc.setFontSize(12);
      doc.text("Comparativo mensal", 40, yy); yy+=8;
      let ultimaY = runTable({
        startY: yy, margin:{left:40,right:40},
        head:[["Mês","Receita","Custo","Lucro","Margem"]],
        body: d.meses.map(m=>[m.label, brl(m.receita), brl(m.custo), brl(m.lucro), (m.receita?(m.lucro/m.receita*100):0).toFixed(1)+"%"]),
        headStyles:{fillColor:[13,79,139],fontSize:9}, bodyStyles:{fontSize:9},
        columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"},4:{halign:"right"}}
      });
      yy = ultimaY + 22;

      // Clientes maior receita
      doc.setFont("helvetica","bold"); doc.setFontSize(12);
      doc.text("Clientes com maior receita", 40, yy); yy+=8;
      ultimaY = runTable({
        startY: yy, margin:{left:40,right:40},
        head:[["Cliente","Receita"]],
        body: d.clientesRank.map(c=>[c.label, brl(c.valor)]),
        headStyles:{fillColor:[13,79,139],fontSize:9}, bodyStyles:{fontSize:9},
        columnStyles:{1:{halign:"right"}}
      });
      yy = ultimaY + 22;

      // Maiores custos
      if(yy > 680){ doc.addPage(); yy=50; }
      doc.setFont("helvetica","bold"); doc.setFontSize(12);
      doc.text("Maiores custos", 40, yy); yy+=8;
      ultimaY = runTable({
        startY: yy, margin:{left:40,right:40},
        head:[["Categoria","Valor"]],
        body: d.custosRank.map(c=>[c.label, brl(c.valor)]),
        headStyles:{fillColor:[214,69,61],fontSize:9}, bodyStyles:{fontSize:9},
        columnStyles:{1:{halign:"right"}}
      });
      yy = ultimaY + 22;

      // Detalhe entradas x saídas
      doc.addPage(); yy=50;
      doc.setFont("helvetica","bold"); doc.setFontSize(12);
      doc.text("Entradas × Saídas (detalhe)", 40, yy); yy+=8;
      runTable({
        startY: yy, margin:{left:40,right:40},
        head:[["Data","Cliente","Tecnologia","Entrada","Saída","Resultado","Status"]],
        body: d.linhas.map(l=>{
          const c=custosLocacaoAjustado(l); const saida=Object.values(c).reduce((a,b)=>a+b,0);
          const ent=Number(l.valorCliente)||0;
          return [fmtData(l.data), l.cliente||"—", l.tecnologia||"—", brl(ent), brl(saida), brl(ent-saida), l.statusPgto||"—"];
        }),
        headStyles:{fillColor:[13,79,139],fontSize:8.5}, bodyStyles:{fontSize:8},
        columnStyles:{3:{halign:"right"},4:{halign:"right"},5:{halign:"right"}}
      });

      // Rodapé com paginação
      const total = doc.internal.getNumberOfPages();
      for(let i=1;i<=total;i++){
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, doc.internal.pageSize.getHeight()-20);
        doc.text(`Página ${i} de ${total}`, pw-40, doc.internal.pageSize.getHeight()-20, {align:"right"});
      }

      doc.save(`levantamento_${d.ini||"inicio"}_${d.fim||"fim"}.pdf`);
      toast("PDF gerado");
    }catch(e){
      console.error(e); toast("Falha ao gerar PDF",true);
    }finally{ btn.disabled=false; btn.textContent=txt; }
  }

  view.querySelector("#lev-aplicar").onclick = calcular;
  view.querySelector("#lev-pdf").onclick = exportarPDF;
  view.querySelectorAll("[data-atalho]").forEach(b=> b.onclick = ()=>{
    const now = new Date();
    let ini, fim = now.toISOString().slice(0,10);
    switch(b.dataset.atalho){
      case "mes": ini = fim.slice(0,8)+"01"; break;
      case "30d": { const dd=new Date(now); dd.setDate(dd.getDate()-30); ini=dd.toISOString().slice(0,10); break; }
      case "ano": ini = fim.slice(0,4)+"-01-01"; break;
      case "tudo": ini = datas[0]||ini0; fim = datas[datas.length-1]||fim0; break;
    }
    $ini.value = ini; $fim.value = fim; calcular();
  });

  calcular();
}
