/* Módulo: Dashboard ============================================== */
import { Store } from "./store.js";
import { BRL, lucroLiquido, fmtData, esc } from "./utils.js";

export async function render(view){
  const [locacoes, equipamentos, despesas, clientes] = await Promise.all([
    Store.list("locacoes"), Store.list("equipamentos"),
    Store.list("despesas"), Store.list("clientes")
  ]);

  const receita = locacoes.reduce((s,l)=> s + (Number(l.valorCliente)||0), 0);
  const lucro   = locacoes.reduce((s,l)=> s + lucroLiquido(l), 0);
  const totalDespesas = despesas.reduce((s,d)=> s + (Number(d.valor)||0), 0);
  const aReceber = locacoes.filter(l=> l.statusPgto === "A Receber")
                           .reduce((s,l)=> s + (Number(l.valorCliente)||0), 0);
  const sublocadas = locacoes.filter(l=> l.frota === "sublocado").length;

  const proximas = [...locacoes].sort((a,b)=> a.data.localeCompare(b.data)).slice(0,6);

  view.innerHTML = `
    <div class="page-head">
      <div><h2>Dashboard</h2><p class="sub">Visão geral das operações</p></div>
    </div>

    <div class="cards-grid">
      <div class="stat-card">
        <div class="label">Receita total</div>
        <div class="value pos">${BRL(receita)}</div>
        <div class="trend">${locacoes.length} locações registradas</div>
        <div class="bar" style="background:var(--ok)"></div>
      </div>
      <div class="stat-card">
        <div class="label">Lucro líquido</div>
        <div class="value">${BRL(lucro)}</div>
        <div class="trend">Após custos de transporte e técnica</div>
        <div class="bar" style="background:var(--brand)"></div>
      </div>
      <div class="stat-card">
        <div class="label">A receber</div>
        <div class="value neg">${BRL(aReceber)}</div>
        <div class="trend">Inadimplência em aberto</div>
        <div class="bar" style="background:var(--warn)"></div>
      </div>
      <div class="stat-card">
        <div class="label">Despesas</div>
        <div class="value">${BRL(totalDespesas)}</div>
        <div class="trend">Fixas + avulsas</div>
        <div class="bar" style="background:var(--danger)"></div>
      </div>
      <div class="stat-card">
        <div class="label">Equipamentos</div>
        <div class="value">${equipamentos.length}</div>
        <div class="trend">${equipamentos.filter(e=>e.frota==="propria").length} frota própria · ${sublocadas} subloc. no período</div>
        <div class="bar" style="background:var(--accent)"></div>
      </div>
      <div class="stat-card">
        <div class="label">Clientes</div>
        <div class="value">${clientes.length}</div>
        <div class="trend">Base cadastrada</div>
        <div class="bar" style="background:var(--info)"></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Próximas locações</h3></div>
      <div class="panel-body flush">
        <div class="table-wrap">
          <table class="data">
            <thead><tr>
              <th>Data</th><th>Cliente</th><th>Tecnologia</th><th>Motorista</th>
              <th>Frota</th><th class="text-right">Valor</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${proximas.map(l=>`
                <tr>
                  <td class="mono">${fmtData(l.data)}</td>
                  <td>${esc(l.cliente)}</td>
                  <td><span class="badge badge-info">${esc(l.tecnologia)}</span></td>
                  <td>${esc(l.motorista||"—")}</td>
                  <td>${l.frota==="sublocado"
                        ? '<span class="badge badge-subloc">Sublocado</span>'
                        : '<span class="badge badge-frota">Própria</span>'}</td>
                  <td class="text-right mono">${BRL(l.valorCliente)}</td>
                  <td>${l.statusPgto==="Pago"
                        ? '<span class="badge badge-ok">Pago</span>'
                        : '<span class="badge badge-warn">A receber</span>'}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
