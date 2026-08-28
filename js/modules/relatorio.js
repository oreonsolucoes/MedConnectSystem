/* ===================================================================
   Módulo: Relatório de Cliente por Período
   Filtra locações de um cliente por intervalo de datas,
   exibe resumo e exporta para PDF (impressão) e Excel (SheetJS).
   =================================================================== */
import { Store } from "./store.js";
import { $, esc, BRL, fmtData, lucroLiquido } from "./utils.js";

export async function abrirRelatorioCliente(cliente){
  // Remove overlay anterior se existir
  document.getElementById("rel-overlay")?.remove();

  const hoje = new Date().toISOString().slice(0,10);
  const tresM = new Date(Date.now() - 90*24*60*60*1000).toISOString().slice(0,10);

  const overlay = document.createElement("div");
  overlay.id = "rel-overlay";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px`;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:100%;max-width:900px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.3)">
      <div style="background:linear-gradient(135deg,#0d4f8b,#12243f);color:#fff;padding:20px 24px;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:12px;opacity:.7;text-transform:uppercase;letter-spacing:.05em">Relatório do cliente</div>
          <div style="font-size:20px;font-weight:800;margin-top:2px">${esc(cliente.nome)}</div>
        </div>
        <button id="rel-close" style="background:rgba(255,255,255,.15);border:none;color:#fff;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer">×</button>
      </div>

      <div style="padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-end">
        <div style="display:flex;flex-direction:column;gap:5px">
          <label style="font-size:12px;font-weight:700;color:#64748b">DATA INICIAL</label>
          <input type="date" id="rel-ini" value="${tresM}" style="padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px">
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">
          <label style="font-size:12px;font-weight:700;color:#64748b">DATA FINAL</label>
          <input type="date" id="rel-fim" value="${hoje}" style="padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px">
        </div>
        <button id="rel-buscar" style="background:#0d4f8b;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">🔍 Buscar</button>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button id="rel-pdf"   style="background:#d6453d;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">🖨️ PDF</button>
          <button id="rel-excel" style="background:#1e9e6a;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:700;cursor:pointer;font-size:13px">📊 Excel</button>
        </div>
      </div>

      <div id="rel-corpo" style="flex:1;overflow-y:auto;padding:20px 24px"></div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.onclick = e=>{ if(e.target===overlay) fechar(); };
  document.getElementById("rel-close").onclick = fechar;

  let dadosAtuais = [];

  async function buscar(){
    const ini = $("#rel-ini").value;
    const fim = $("#rel-fim").value;
    if(!ini||!fim) return;

    const todas = await Store.list("locacoes");
    dadosAtuais = todas
      .filter(l=> l.cliente===cliente.nome && l.data>=ini && l.data<=fim)
      .sort((a,b)=>a.data.localeCompare(b.data));

    renderCorpo(dadosAtuais, ini, fim);
  }

  function renderCorpo(lista, ini, fim){
    const corpo = document.getElementById("rel-corpo");
    if(!lista.length){
      corpo.innerHTML=`<div style="text-align:center;padding:50px;color:#64748b"><div style="font-size:40px">📋</div><div style="margin-top:10px;font-weight:600">Nenhuma locação neste período.</div></div>`;
      return;
    }

    const receita = lista.reduce((s,l)=> s+(+l.valorCliente||0), 0);
    const lucro   = lista.reduce((s,l)=> s+lucroLiquido(l), 0);
    const pagos   = lista.filter(l=>l.statusPgto==="Pago").length;
    const aReceber= lista.filter(l=>l.statusPgto==="A Receber").reduce((s,l)=>s+(+l.valorCliente||0),0);

    corpo.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
        ${card("Locações",lista.length,"#0d4f8b")}
        ${card("Receita total",BRL(receita),"#1e9e6a")}
        ${card("Lucro líquido",BRL(lucro),"#1c9bd8")}
        ${card("A receber",BRL(aReceber),"#e0a010")}
        ${card("Pagas",pagos+" de "+lista.length,"#1e9e6a")}
      </div>

      <div style="overflow-x:auto">
        <table id="rel-tabela" style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f8fafc">
              ${["Data","Tecnologia","Horário","Período","Motorista","Responsável","Valor","Lucro","Status"]
                .map(h=>`<th style="text-align:left;padding:10px 12px;color:#64748b;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid #e2e8f0;white-space:nowrap">${h}</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${lista.map(l=>`
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 12px;white-space:nowrap">${fmtData(l.data)}</td>
                <td style="padding:10px 12px"><span style="background:#e8f1fa;color:#0d4f8b;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700">${esc(l.tecnologia||"—")}</span></td>
                <td style="padding:10px 12px;white-space:nowrap">${esc(l.horario||"—")}</td>
                <td style="padding:10px 12px">${esc(l.periodo||"—")}</td>
                <td style="padding:10px 12px">${esc(l.motorista||"—")}</td>
                <td style="padding:10px 12px">${esc(l.responsavel||"—")}</td>
                <td style="padding:10px 12px;font-weight:700">${BRL(l.valorCliente)}</td>
                <td style="padding:10px 12px;font-weight:700;color:#1e9e6a">${BRL(lucroLiquido(l))}</td>
                <td style="padding:10px 12px">${l.statusPgto==="Pago"
                  ?'<span style="background:#e2f5ec;color:#1e9e6a;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700">Pago</span>'
                  :'<span style="background:#fdf3dc;color:#a9760a;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700">A receber</span>'}</td>
              </tr>`).join("")}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc;font-weight:700">
              <td colspan="6" style="padding:12px;color:#64748b">TOTAL</td>
              <td style="padding:12px">${BRL(receita)}</td>
              <td style="padding:12px;color:#1e9e6a">${BRL(lucro)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }

  function card(label, valor, cor){
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;border-top:3px solid ${cor}">
      <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.03em">${label}</div>
      <div style="font-size:20px;font-weight:800;color:#12243f;margin-top:6px">${valor}</div>
    </div>`;
  }

  function fechar(){ overlay.remove(); }

  // PDF via impressão
  document.getElementById("rel-pdf").onclick = ()=>{
    const tabela = document.getElementById("rel-tabela");
    if(!tabela) return;
    const win = window.open("","_blank");
    win.document.write(`<html><head><title>Relatório ${esc(cliente.nome)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{padding:8px 10px;border:1px solid #ddd;font-size:12px}th{background:#f0f4f8;font-weight:700}
      h2{color:#0d4f8b}</style></head><body>
      <h2>Relatório · ${esc(cliente.nome)}</h2>
      <p>Período: ${document.getElementById("rel-ini").value} até ${document.getElementById("rel-fim").value}</p>
      ${tabela.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(()=>{ win.print(); }, 400);
  };

  // Excel via SheetJS
  document.getElementById("rel-excel").onclick = async()=>{
    if(!dadosAtuais.length) return;
    try {
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const rows = [
        ["Data","Tecnologia","Horário","Período","Motorista","Responsável","Valor (R$)","Lucro (R$)","Status"],
        ...dadosAtuais.map(l=>[
          fmtData(l.data), l.tecnologia||"", l.horario||"", l.periodo||"",
          l.motorista||"", l.responsavel||"",
          Number(l.valorCliente)||0, lucroLiquido(l), l.statusPgto||""
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
      XLSX.writeFile(wb, `Relatorio_${cliente.nome.replace(/\s+/g,"_")}.xlsx`);
    } catch(e){
      alert("Erro ao gerar Excel: "+e.message);
    }
  };

  document.getElementById("rel-buscar").onclick = buscar;
  await buscar(); // busca automática ao abrir
}
