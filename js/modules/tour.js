/* ===================================================================
   MedConnect · Tour de Onboarding
   Tela de boas-vindas com cards de módulos + tour guiado pelo menu.
   Abre via botão "Tour do sistema" no menu lateral.
   =================================================================== */

const PASSOS = [
  {
    rota: "dashboard",
    titulo: "Dashboard",
    desc: "Visão geral da operação: receita total, lucro líquido, valores a receber e locações do período. Ponto de partida do dia.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`
  },
  {
    rota: "romaneio",
    titulo: "Romaneio",
    desc: "Tabela completa de entregas: data, tecnologia, cliente, endereço, horário e responsável. Check-list de entrega e retirada separados por fase.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`
  },
  {
    rota: "locacoes",
    titulo: "Locações",
    desc: "Cadastre locações com busca de cliente por nome, custo do motorista, comissão automática do responsável e cálculo de lucro líquido em tempo real. Bloqueia equipamento se já estiver alocado no horário.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`
  },
  {
    rota: "clientes",
    titulo: "Clientes",
    desc: "Cadastro completo: nome da clínica, CPF/CNPJ, responsável, endereço com busca por CEP, voltagem, restrições de acesso, ponto de referência e espaço para mesa. Gere relatórios por período com exportação PDF e Excel.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  },
  {
    rota: "equipamentos",
    titulo: "Equipamentos",
    desc: "Frota com número de série, QR Code, tecnologia e acessórios. Diferencia equipamentos próprios de sublocados — ao cadastrar uma locação, o sistema avisa se o equipamento já está ocupado no horário.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>`
  },
  {
    rota: "motoristas",
    titulo: "Motoristas",
    desc: "Gerencie a equipe de entregas e os PINs de acesso ao app. Gere PINs aleatórios e envie direto pelo WhatsApp com link de acesso pronto. O app funciona offline após o primeiro login.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M8.5 14.5A5 5 0 0 0 12 16a5 5 0 0 0 3.5-1.5"/></svg>`
  },
  {
    rota: "responsaveis",
    titulo: "Responsáveis",
    desc: "Cadastre os responsáveis pelas locações com tipo de comissão (valor fixo ou percentual). Quando um responsável é selecionado numa locação, a comissão é descontada automaticamente do lucro líquido.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 11l2 2 4-4"/></svg>`
  },
  {
    rota: "fornecedores",
    titulo: "Fornecedores",
    desc: "Cadastro de parceiros e sublocadores de equipamentos externos. O custo do fornecedor é informado na locação e descontado automaticamente do lucro líquido.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
  },
  {
    rota: "financeiro",
    titulo: "Financeiro",
    desc: "Receitas, despesas, margem de lucro e inadimplência. Todas as comissões de responsáveis, custos de motoristas e fornecedores entram automaticamente no cálculo. Acompanhe o fluxo real do negócio.",
    ico: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
  }
];

let passoAtual = 0;
let navegar = null;

/* ===================== ESTILOS ===================== */
function injetarEstilos(){
  if(document.getElementById("tour-styles")) return;
  const s = document.createElement("style");
  s.id = "tour-styles";
  s.textContent = `
    #tour-overlay{
      position:fixed;inset:0;background:rgba(10,20,40,.7);z-index:200;
      display:flex;align-items:center;justify-content:center;padding:20px;
      animation:tourFadeIn .25s ease;
    }
    @keyframes tourFadeIn{ from{opacity:0} to{opacity:1} }
    #tour-bv{
      background:#fff;border-radius:20px;width:100%;max-width:900px;
      max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.3);
      animation:tourSlideUp .3s ease;
    }
    @keyframes tourSlideUp{ from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
    #tour-bv .bv-head{
      background:linear-gradient(135deg,#0d4f8b,#12243f);
      color:#fff;padding:36px 36px 28px;border-radius:20px 20px 0 0;text-align:center;
    }
    #tour-bv .bv-head img{ width:200px;max-width:70%;filter:brightness(0) invert(1);margin-bottom:16px; }
    #tour-bv .bv-head h2{ font-size:26px;font-weight:800;margin-bottom:8px; }
    #tour-bv .bv-head p{ color:#a9c8e8;font-size:15px; }
    #tour-bv .bv-body{ padding:28px 32px; }
    #tour-bv .bv-grid{
      display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;margin-bottom:24px;
    }
    #tour-bv .bv-card{
      border:1px solid #e2e8f0;border-radius:14px;padding:18px;cursor:pointer;
      transition:.15s;background:#fff;
    }
    #tour-bv .bv-card:hover{ border-color:#0d4f8b;background:#f0f7ff;transform:translateY(-2px); }
    #tour-bv .bv-card .bv-ico{
      width:44px;height:44px;border-radius:12px;background:#e8f1fa;
      display:flex;align-items:center;justify-content:center;color:#0d4f8b;margin-bottom:10px;
    }
    #tour-bv .bv-card h4{ font-size:14px;color:#12243f;margin-bottom:4px; }
    #tour-bv .bv-card p{ font-size:12px;color:#64748b;line-height:1.5; }
    #tour-bv .bv-footer{ display:flex;gap:12px;justify-content:center;flex-wrap:wrap; }

    #tour-balao{
      position:fixed;z-index:210;background:#fff;border-radius:16px;
      padding:24px;width:320px;box-shadow:0 16px 48px rgba(0,0,0,.25);
      animation:tourSlideUp .2s ease;
    }
    #tour-balao::before{
      content:"";position:absolute;left:24px;top:-10px;
      border:10px solid transparent;border-bottom-color:#fff;border-top:none;
    }
    #tour-balao .tb-ico{
      width:48px;height:48px;border-radius:14px;background:#e8f1fa;
      display:flex;align-items:center;justify-content:center;color:#0d4f8b;margin-bottom:12px;
    }
    #tour-balao .tb-prog{
      font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;
      letter-spacing:.05em;margin-bottom:6px;
    }
    #tour-balao h3{ font-size:17px;color:#12243f;margin-bottom:8px; }
    #tour-balao p{ font-size:13px;color:#475569;line-height:1.6;margin-bottom:18px; }
    #tour-balao .tb-btns{ display:flex;gap:8px; }
    #tour-balao .tb-btns button{ flex:1;padding:10px;border-radius:10px;font-weight:700;font-size:13px;border:none;cursor:pointer; }
    #tour-balao .tb-prev{ background:#f1f5f9;color:#475569; }
    #tour-balao .tb-prev:hover{ background:#e2e8f0; }
    #tour-balao .tb-next{ background:#0d4f8b;color:#fff; }
    #tour-balao .tb-next:hover{ background:#0a3a66; }
    #tour-balao .tb-fechar{ position:absolute;top:14px;right:14px;background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer; }
    #tour-balao .tb-fechar:hover{ color:#475569; }
    .nav-item.tour-ativo{
      background:#1c9bd8 !important;color:#fff !important;
      box-shadow:0 0 0 3px #fff, 0 0 0 5px #1c9bd8;
      position:relative;z-index:205;
    }
    #tour-backdrop{ position:fixed;inset:0;z-index:200;background:rgba(10,20,40,.6); }
  `;
  document.head.appendChild(s);
}

/* ===================== TELA DE BOAS-VINDAS ===================== */
export function abrirBoasVindas(navegarFn){
  navegar = navegarFn;
  injetarEstilos();
  fecharTudo();

  const overlay = document.createElement("div");
  overlay.id = "tour-overlay";
  overlay.innerHTML = `
    <div id="tour-bv">
      <div class="bv-head">
        <img src="assets/logo.png" alt="MedConnect" />
        <h2>Bem-vinda ao MedConnect! 🎉</h2>
        <p>Sistema de gestão de locações de tecnologia estética · Conheça todos os módulos</p>
      </div>
      <div class="bv-body">
        <div class="bv-grid">
          ${PASSOS.map((p,i)=>`
            <div class="bv-card" data-passo="${i}">
              <div class="bv-ico">${p.ico}</div>
              <h4>${p.titulo}</h4>
              <p>${p.desc}</p>
            </div>`).join("")}
        </div>
        <div class="bv-footer">
          <button class="btn btn-ghost" id="tour-pular-bv" style="min-width:140px">Ir para o sistema</button>
          <button class="btn btn-primary" id="tour-comecar" style="min-width:200px">▶ Iniciar tour guiado</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelectorAll(".bv-card").forEach(c=> c.onclick=()=>{
    fecharTudo();
    navegar(PASSOS[+c.dataset.passo].rota);
  });

  document.getElementById("tour-pular-bv").onclick = fecharTudo;
  document.getElementById("tour-comecar").onclick = ()=>{
    fecharTudo();
    setTimeout(()=> iniciarTour(navegarFn), 200);
  };

  overlay.onclick = e=>{ if(e.target===overlay) fecharTudo(); };
}

/* ===================== TOUR GUIADO ===================== */
function iniciarTour(navegarFn){
  navegar = navegarFn;
  passoAtual = 0;
  injetarEstilos();
  document.getElementById("app-shell")?.classList.remove("collapsed");
  mostrarPasso();
}

function mostrarPasso(){
  fecharBalao();
  const p = PASSOS[passoAtual];
  navegar(p.rota);

  const bd = document.createElement("div");
  bd.id = "tour-backdrop";
  bd.onclick = fecharTudo;
  document.body.appendChild(bd);

  setTimeout(()=>{
    document.querySelectorAll(".nav-item").forEach(n=> n.classList.remove("tour-ativo"));
    const navItem = document.querySelector(`.nav-item[data-route="${p.rota}"]`);
    if(navItem){
      navItem.classList.add("tour-ativo");
      posicionarBalao(navItem, p);
    } else {
      posicionarBalaoCenter(p);
    }
  }, 350);
}

function posicionarBalao(navItem, p){
  const rect = navItem.getBoundingClientRect();
  const balao = criarBalao(p);
  document.body.appendChild(balao);
  const top  = rect.bottom + 12;
  const left = Math.min(rect.left, window.innerWidth - 340);
  balao.style.top  = `${top}px`;
  balao.style.left = `${Math.max(10, left)}px`;
  const bRect = balao.getBoundingClientRect();
  if(bRect.bottom > window.innerHeight - 10)
    balao.style.top = `${rect.top - bRect.height - 12}px`;
}

function posicionarBalaoCenter(p){
  const balao = criarBalao(p);
  balao.style.top  = "50%";
  balao.style.left = "50%";
  balao.style.transform = "translate(-50%,-50%)";
  document.body.appendChild(balao);
}

function criarBalao(p){
  const balao = document.createElement("div");
  balao.id = "tour-balao";
  const ehUltimo = passoAtual === PASSOS.length - 1;
  balao.innerHTML = `
    <button class="tb-fechar" id="tour-fechar-balao">×</button>
    <div class="tb-ico">${p.ico}</div>
    <div class="tb-prog">Passo ${passoAtual+1} de ${PASSOS.length}</div>
    <h3>${p.titulo}</h3>
    <p>${p.desc}</p>
    <div class="tb-btns">
      ${passoAtual > 0
        ? `<button class="tb-prev" id="tour-prev">← Anterior</button>`
        : `<button class="tb-prev" id="tour-prev" style="opacity:.4;pointer-events:none">← Anterior</button>`}
      <button class="tb-next" id="tour-next">${ehUltimo ? "✓ Concluir" : "Próximo →"}</button>
    </div>`;

  const prog = document.createElement("div");
  prog.style.cssText = `height:3px;background:#e2e8f0;border-radius:3px;margin-bottom:16px;overflow:hidden`;
  const fill = document.createElement("div");
  fill.style.cssText = `height:100%;background:#0d4f8b;border-radius:3px;width:${((passoAtual+1)/PASSOS.length)*100}%;transition:.3s`;
  prog.appendChild(fill);
  balao.insertBefore(prog, balao.querySelector(".tb-ico"));

  balao.querySelector("#tour-fechar-balao").onclick = fecharTudo;
  balao.querySelector("#tour-prev").onclick = ()=>{ passoAtual--; mostrarPasso(); };
  balao.querySelector("#tour-next").onclick = ()=>{
    if(passoAtual < PASSOS.length-1){ passoAtual++; mostrarPasso(); }
    else fecharTudo();
  };

  const keyHandler = e=>{
    if(e.key==="ArrowRight"||e.key==="Enter") balao.querySelector("#tour-next").click();
    if(e.key==="ArrowLeft") balao.querySelector("#tour-prev").click();
    if(e.key==="Escape") fecharTudo();
  };
  document.addEventListener("keydown", keyHandler);
  balao._keyHandler = keyHandler;

  return balao;
}

function fecharBalao(){
  const b = document.getElementById("tour-balao");
  if(b){ document.removeEventListener("keydown", b._keyHandler); b.remove(); }
  document.getElementById("tour-backdrop")?.remove();
  document.querySelectorAll(".nav-item").forEach(n=> n.classList.remove("tour-ativo"));
}

function fecharTudo(){
  fecharBalao();
  document.getElementById("tour-overlay")?.remove();
}

export { iniciarTour, fecharTudo };
