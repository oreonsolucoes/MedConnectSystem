/* Utilitários compartilhados ===================================== */

export const $  = (sel, ctx=document) => ctx.querySelector(sel);
export const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

export const BRL = v =>
  (Number(v)||0).toLocaleString("pt-BR",{ style:"currency", currency:"BRL" });

export const fmtData = iso => {
  if (!iso) return "—";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const diaSemana = iso => {
  if (!iso) return "";
  const dt = new Date(iso + "T12:00:00");
  return ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][dt.getDay()];
};

/** Cálculo de lucro líquido de uma locação */
export const lucroLiquido = l =>
  (Number(l.valorCliente)||0)
  - (Number(l.custoTransporte)||0)
  - (Number(l.custoTecnica)||0)
  - (Number(l.motoristaCusto)||0);

export function toast(msg, isError=false){
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " err" : "");
  setTimeout(()=> t.classList.add("hidden"), 2600);
}

export function openModal(title, html){
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
export function closeModal(){ $("#modal").classList.add("hidden"); }

/** Escapa HTML para evitar injeção em campos livres */
export const esc = s => String(s??"").replace(/[&<>"']/g,
  c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
