/* Módulo: Romaneio Dinâmico + Check-list Digital (Visão Motorista)
   Otimizado para smartphone. Assinatura via Canvas JS.
   =================================================================== */
import { Store } from "./store.js";
import { $, $$, fmtData, diaSemana, esc, openModal, closeModal, toast } from "./utils.js";
import { checklistTemplates, checklistGenerico } from "./mock-data.js";

export async function render(view, currentUser){
  const equipamentos = await Store.list("equipamentos");

  view.innerHTML = `
    <div class="page-head">
      <div><h2>Romaneio da semana</h2>
      <p class="sub">Entregas atribuídas a <strong>${esc(currentUser.nome)}</strong> · atualização em tempo real</p></div>
    </div>
    <div class="toolbar">
      <div class="search"><input id="rom-search" placeholder="Buscar cliente, tecnologia, responsável..." /></div>
    </div>
    <div class="panel"><div class="panel-body flush" id="rom-list"></div></div>`;

  Store.watch("locacoes", lista=>{
    // Admin vê tudo; motorista vê apenas as próprias entregas
    let minhas = lista;
    if (currentUser.perfil === "motorista"){
      minhas = lista.filter(l => (l.motorista||"").toLowerCase() === currentUser.nome.toLowerCase());
    }
    minhas.sort((a,b)=> (a.data+(a.horario||"")).localeCompare(b.data+(b.horario||"")));

    const draw = data=>{
      $("#rom-list").innerHTML = `<div class="table-wrap"><table class="data">
        <thead><tr>
          <th>Data</th><th>Dia</th><th>Tecnologia</th><th>Cliente</th><th>Endereço</th>
          <th>Horário</th><th>Qtde horas</th><th>Responsável</th><th>Motorista</th>
          <th>Status</th><th></th>
        </tr></thead>
        <tbody>
        ${data.map(l=>`
          <tr>
            <td class="mono">${fmtData(l.data)}</td>
            <td>${diaSemana(l.data)}</td>
            <td><span class="badge ${l.frota==="sublocado"?"badge-subloc":"badge-info"}">${esc(l.tecnologia)}</span></td>
            <td><strong>${esc(l.cliente)}</strong></td>
            <td style="max-width:260px;font-size:12.5px">${esc(l.endereco||"Ver cadastro do cliente")}</td>
            <td class="mono" style="white-space:nowrap">${esc(l.horario||"—")}</td>
            <td class="mono text-center">${esc(l.periodo||"—")}</td>
            <td>${esc(l.responsavel||"—")}</td>
            <td>${esc(l.motorista||"—")}</td>
            <td>${l.checklistOk?'<span class="badge badge-ok">Concluído</span>':'<span class="badge badge-warn">Pendente</span>'}</td>
            <td class="text-right"><button class="btn btn-primary btn-sm" data-chk="${l.id}">📋 Check-list</button></td>
          </tr>`).join("") ||
          `<tr><td colspan="11" style="text-align:center;padding:26px" class="text-muted">Nenhuma entrega no período.</td></tr>`}
        </tbody>
      </table></div>`;
      $$("[data-chk]").forEach(b=> b.onclick=()=> visualizarChecklist(minhas.find(x=>x.id===b.dataset.chk)));
    };

    draw(minhas);
    const inp = $("#rom-search");
    if (inp) inp.oninput = e=>{
      const q = e.target.value.toLowerCase();
      draw(minhas.filter(l => (l.cliente+l.tecnologia+(l.responsavel||"")+(l.endereco||"")+(l.motorista||"")).toLowerCase().includes(q)));
    };
  });

  /* ---- Visualização somente leitura do check-list (visão admin) ---- */
  function visualizarChecklist(loc){
    const template = checklistTemplates[loc.tecnologia] || checklistGenerico;
    const salvos   = loc.checklist || {};
    const fase     = salvos._fase || "—";
    const quando   = salvos._quando
      ? new Date(salvos._quando).toLocaleString("pt-BR")
      : null;

    /* Seções de itens — somente leitura (checkboxes disabled) */
    const secoes = Object.entries(template).map(([sec, itens])=>{
      const marcados = salvos[sec] || [];
      const total    = itens.length;
      const ok       = marcados.length;
      return `
        <div class="chk-section">
          <h4 style="display:flex;justify-content:space-between;align-items:center">
            ${esc(sec)}
            <span style="font-size:12px;font-weight:600;color:${ok===total?"var(--ok)":"var(--warn)"}">
              ${ok}/${total}
            </span>
          </h4>
          ${itens.map(it=>{
            const checked = marcados.includes(it);
            return `<div class="chk-item">
              <input type="checkbox" ${checked?"checked":""} disabled
                style="accent-color:var(--ok);opacity:${checked?1:.35}">
              <label style="color:${checked?"var(--text)":"var(--muted)"}">${esc(it)}</label>
            </div>`;
          }).join("")}
        </div>`;
    }).join("");

    /* Fotos/vídeos salvos no Drive */
    const midias = salvos._midia || [];
    const midiasHTML = midias.length
      ? `<div class="chk-section">
           <h4>📸 Fotos / Vídeos (${midias.length} arquivo${midias.length>1?"s":""})</h4>
           <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:8px">
             ${midias.map(m=>`
               <a href="${esc(m.url||"#")}" target="_blank" rel="noopener"
                 style="display:block;aspect-ratio:1;border-radius:10px;overflow:hidden;background:#f1f5f9;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--brand);text-decoration:none;padding:6px;text-align:center">
                 ${m.tipo==="video"||m.nome?.match(/\.(mp4|mov|avi)$/i)?"🎬 ":"📷 "}
                 ${esc(m.fase||"")}<br>
                 <span style="font-size:10px;color:var(--muted);word-break:break-all">${esc(m.nome||"arquivo")}</span>
               </a>`).join("")}
           </div>
         </div>`
      : `<div class="chk-section"><h4>📸 Fotos / Vídeos</h4>
           <p class="text-muted" style="font-size:13px">Nenhum arquivo enviado.</p></div>`;

    /* Assinatura */
    const assHTML = salvos._assinatura
      ? `<div class="chk-section">
           <h4>✍️ Assinatura do cliente</h4>
           <img src="${salvos._assinatura}" style="max-width:100%;border:1px solid var(--line);border-radius:10px;background:#fcfdfe">
         </div>`
      : `<div class="chk-section"><h4>✍️ Assinatura do cliente</h4>
           <p class="text-muted" style="font-size:13px">Não coletada.</p></div>`;

    /* Observações */
    const obsHTML = salvos._obs
      ? `<div class="chk-section"><h4>📝 Observações</h4>
           <p style="font-size:14px;white-space:pre-wrap">${esc(salvos._obs)}</p></div>`
      : "";

    openModal(`📋 Check-list · ${esc(loc.cliente)}`, `
      <div style="background:var(--brand-light);border-radius:10px;padding:12px 14px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:12px;font-size:13px">
        <span>🔬 <strong>${esc(loc.tecnologia)}</strong></span>
        <span>📅 ${fmtData(loc.data)} · ${esc(loc.horario||"—")}</span>
        <span>🔄 Fase: <strong>${esc(fase)}</strong></span>
        ${quando?`<span>🕒 Preenchido em ${quando}</span>`:""}
        <span>${loc.checklistOk
          ?'<span class="badge badge-ok">✓ Concluído</span>'
          :'<span class="badge badge-warn">Pendente</span>'}</span>
      </div>

      ${!loc.checklistOk
        ? `<div style="text-align:center;padding:30px;color:var(--muted)">
             <div style="font-size:40px">📋</div>
             <div style="margin-top:10px;font-weight:600">Check-list ainda não preenchido pelo motorista.</div>
           </div>`
        : secoes + midiasHTML + assHTML + obsHTML}

      <div class="form-actions">
        <button class="btn btn-primary" id="chk-fechar">Fechar</button>
      </div>
    `);
    $("#chk-fechar").onclick = closeModal;
  }
}
