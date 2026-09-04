/* Módulos de Cadastros Base ===================================== */
import { Store } from "./store.js";
import { $, esc, openModal, closeModal, toast } from "./utils.js";
import { abrirRelatorioCliente } from "./relatorio.js";

/* Helper genérico de tabela com toolbar de busca -------------------- */
function tabela({ head, rows }){
  return `<div class="table-wrap"><table class="data">
    <thead><tr>${head.map(h=>`<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function pageWrap(view, titulo, sub, btnLabel, onNew){
  view.innerHTML = `
    <div class="page-head">
      <div><h2>${titulo}</h2><p class="sub">${sub}</p></div>
      <button class="btn btn-primary" id="btn-new">+ ${btnLabel}</button>
    </div>
    <div class="toolbar">
      <div class="search"><input id="search" placeholder="Buscar..." /></div>
    </div>
    <div class="panel"><div class="panel-body flush" id="list"></div></div>`;
  $("#btn-new").onclick = onNew;
}

/* ===================== CLIENTES ===================== */
export async function renderClientes(view){
  pageWrap(view,"Clientes","Base de clientes, endereços e relatórios por período","Novo cliente",()=>formCliente());
  Store.watch("clientes", lista => {lista = [...lista].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));
    const draw = (data)=> {
      $("#list").innerHTML = tabela({
        head:["Nome","Contato","Endereço comercial","Voltagem",""],
        rows: data.map(c=>`
          <tr>
            <td><strong>${esc(c.nome)}</strong></td>
            <td>${esc(c.telefone||"—")}<br><span class="text-muted" style="font-size:11px">${esc(c.horario||"")}</span></td>
            <td style="max-width:280px;font-size:12.5px">${esc(c.endComercial||"—")}</td>
            <td>${esc(c.voltagem||"—")}</td>
            <td class="text-right" style="white-space:nowrap">
              <button class="btn btn-ghost btn-sm" data-rel="${c.id}" title="Relatório por período">📊 Relatório</button>
              <button class="btn-icon" data-edit="${c.id}">✏️</button>
              <button class="btn-icon" data-del="${c.id}">🗑️</button>
            </td>
          </tr>`).join("") || `<tr><td colspan="5" class="text-muted" style="padding:24px;text-align:center">Nenhum cliente.</td></tr>`
      });
      // Relatório
      document.querySelectorAll("[data-rel]").forEach(b=> b.onclick=()=>{
        const cli = lista.find(x=>x.id===b.dataset.rel);
        if(cli) abrirRelatorioCliente(cli);
      });
      bindRowActions("clientes", lista, formCliente);
    };
    draw(lista);
    $("#search").oninput = e => {
      const q = e.target.value.toLowerCase();
      draw(lista.filter(c => (c.nome+(c.endComercial||"")+(c.telefone||"")).toLowerCase().includes(q)));
    };
  });

  function formCliente(c={}){
    openModal(c.id?"Editar cliente":"Novo cliente", `
      <div class="form-grid">
        <div class="field full"><label>Nome completo da clínica</label>
          <input id="f-nome" value="${esc(c.nome||"")}" placeholder="Ex.: Clínica Bella Vita"></div>
        <div class="field"><label>CPF / CNPJ</label>
          <select id="f-doc"><option ${c.doc==="CPF"?"selected":""}>CPF</option><option ${c.doc==="CNPJ"?"selected":""}>CNPJ</option></select></div>
        <div class="field"><label>Número do documento</label>
          <input id="f-documento" value="${esc(c.documento||"")}"></div>
        <div class="field"><label>Nome do responsável da clínica</label>
          <input id="f-resp-cli" value="${esc(c.responsavelClinica||"")}" placeholder="Nome de quem recebe"></div>
        <div class="field"><label>Telefone / WhatsApp</label>
          <input id="f-tel" value="${esc(c.telefone||"")}" placeholder="(11) 9xxxx-xxxx"></div>
        <div class="field"><label>E-mail</label>
          <input type="email" id="f-email" value="${esc(c.email||"")}" placeholder="clinica@email.com"></div>

        <!-- Busca de CEP -->
        <div class="field full" style="border-top:1px solid var(--line);padding-top:14px;margin-top:4px">
          <label style="color:var(--brand);font-size:13px;font-weight:700">📍 Endereço comercial via CEP</label>
          <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">
            <input id="f-cep" value="${esc(c.cep||"")}" placeholder="00000-000" maxlength="9"
              style="width:150px;padding:9px 11px;border:1.5px solid var(--brand);border-radius:8px">
            <button class="btn btn-ghost btn-sm" id="btn-cep" type="button">🔍 Buscar CEP</button>
            <span id="cep-status" style="font-size:12px;color:var(--muted);align-self:center"></span>
          </div>
        </div>
        <div class="field"><label>Rua / Logradouro</label>
          <input id="f-rua" value="${esc(c.rua||"")}"></div>
        <div class="field"><label>Número</label>
          <input id="f-numero" value="${esc(c.numero||"")}" placeholder="Nº"></div>
        <div class="field"><label>Complemento (sala, andar...)</label>
          <input id="f-comp" value="${esc(c.complemento||"")}"></div>
        <div class="field"><label>Bairro</label>
          <input id="f-bairro" value="${esc(c.bairro||"")}"></div>
        <div class="field"><label>Cidade</label>
          <input id="f-cidade" value="${esc(c.cidade||"")}"></div>
        <div class="field"><label>Estado</label>
          <input id="f-estado" value="${esc(c.estado||"")}" maxlength="2"></div>
        <div class="field full"><label>Endereço comercial completo</label>
          <input id="f-com" value="${esc(c.endComercial||"")}"
            placeholder="Preenchido pelo CEP ou digite manualmente"></div>
        <div class="field full"><label>Ponto de referência</label>
          <input id="f-ref" value="${esc(c.pontoReferencia||"")}" placeholder="Ex.: Próximo ao metrô, portaria azul..."></div>
        <div class="field full"><label>Endereço residencial</label>
          <input id="f-res" value="${esc(c.endResidencial||"")}"></div>

        <div class="field"><label>Voltagem do local</label>
          <select id="f-volt">
            <option value="" ${!c.voltagem?"selected":""}>Não informado</option>
            <option value="110V" ${c.voltagem==="110V"?"selected":""}>110V</option>
            <option value="220V" ${c.voltagem==="220V"?"selected":""}>220V</option>
            <option value="110V/220V" ${c.voltagem==="110V/220V"?"selected":""}>110V e 220V</option>
          </select></div>
        <div class="field"><label>Horário de funcionamento</label>
          <input id="f-hor" value="${esc(c.horario||"")}" placeholder="Ex.: Seg a Sex 9h–18h"></div>
        <div class="field full"><label>Restrições de acesso (escada, elevador, peso...)</label>
          <input id="f-rest" value="${esc(c.restricoes||"")}" placeholder="Ex.: Sem elevador, escada com 2 lances"></div>
        <div class="field full"><label>Tem espaço para mesa do equipamento?</label>
          <select id="f-espaco">
            <option value="" ${!c.espaco?"selected":""}>Não informado</option>
            <option value="Sim" ${c.espaco==="Sim"?"selected":""}>Sim</option>
            <option value="Não" ${c.espaco==="Não"?"selected":""}>Não</option>
            <option value="Parcial" ${c.espaco==="Parcial"?"selected":""}>Parcial (mesa pequena)</option>
          </select></div>

        <div class="form-actions">
          <button class="btn btn-ghost" id="c-cancel">Cancelar</button>
          <button class="btn btn-primary" id="c-save">Salvar</button>
        </div>
      </div>`);

    // Formata CEP
    $("#f-cep").oninput = e=>{
      let v = e.target.value.replace(/\D/g,"");
      if(v.length>5) v = v.slice(0,5)+"-"+v.slice(5,8);
      e.target.value = v;
    };

    // Busca CEP via ViaCEP
    $("#btn-cep").onclick = async()=>{
      const cep = $("#f-cep").value.replace(/\D/g,"");
      if(cep.length!==8){ toast("CEP inválido — deve ter 8 dígitos",true); return; }
      $("#cep-status").textContent = "Buscando...";
      try{
        const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const d = await r.json();
        if(d.erro){ toast("CEP não encontrado",true); $("#cep-status").textContent=""; return; }
        $("#f-rua").value    = d.logradouro||"";
        $("#f-bairro").value = d.bairro||"";
        $("#f-cidade").value = d.localidade||"";
        $("#f-estado").value = d.uf||"";
        montarEnderecoCompleto();
        $("#cep-status").textContent = "✓ Endereço encontrado";
        setTimeout(()=>$("#cep-status").textContent="", 3000);
        $("#f-numero").focus();
      } catch(e){ toast("Erro ao buscar CEP",true); $("#cep-status").textContent=""; }
    };

    // Monta endereço completo automaticamente
    const montarEnderecoCompleto = ()=>{
      const rua    = $("#f-rua").value.trim();
      const num    = $("#f-numero").value.trim();
      const comp   = $("#f-comp").value.trim();
      const bairro = $("#f-bairro").value.trim();
      const cidade = $("#f-cidade").value.trim();
      const estado = $("#f-estado").value.trim();
      const partes = [rua, num, comp, bairro, cidade, estado].filter(Boolean);
      $("#f-com").value = partes.join(", ");
    };
    ["f-rua","f-numero","f-comp","f-bairro","f-cidade","f-estado"].forEach(id=>{
      const el = $("#"+id); if(el) el.oninput = montarEnderecoCompleto;
    });

    $("#c-cancel").onclick = closeModal;
    $("#c-save").onclick = async ()=>{
      const data = {
        nome:              $("#f-nome").value.trim(),
        doc:               $("#f-doc").value,
        documento:         $("#f-documento").value.trim(),
        responsavelClinica:$("#f-resp-cli").value.trim(),
        telefone:          $("#f-tel").value.trim(),
        email:             $("#f-email").value.trim(),
        cep:               $("#f-cep").value.trim(),
        rua:               $("#f-rua").value.trim(),
        numero:            $("#f-numero").value.trim(),
        complemento:       $("#f-comp").value.trim(),
        bairro:            $("#f-bairro").value.trim(),
        cidade:            $("#f-cidade").value.trim(),
        estado:            $("#f-estado").value.trim(),
        endComercial:      $("#f-com").value.trim(),
        pontoReferencia:   $("#f-ref").value.trim(),
        endResidencial:    $("#f-res").value.trim(),
        voltagem:          $("#f-volt").value,
        horario:           $("#f-hor").value.trim(),
        restricoes:        $("#f-rest").value.trim(),
        espaco:            $("#f-espaco").value
      };
      if(!data.nome) return toast("Informe o nome", true);
      if(c.id){
        await Store.update("clientes", c.id, data);
        // Propaga mudança de nome para todas as locações deste cliente
        if(data.nome !== c.nome){
          const todasLoc = await Store.list("locacoes");
          const paraAtualizar = todasLoc.filter(l => l.clienteId === c.id);
          await Promise.all(paraAtualizar.map(l =>
            Store.update("locacoes", l.id, { cliente: data.nome, endereco: data.endComercial || l.endereco })
          ));
          if(paraAtualizar.length) toast(`Nome atualizado em ${paraAtualizar.length} locação(ões)`);
        }
      } else {
        await Store.add("clientes", data);
      }
      closeModal(); toast("Cliente salvo");
    };
  }
}

/* ===================== MOTORISTAS ===================== */
export async function renderMotoristas(view){
  // Monta a estrutura da página manualmente (não usa pageWrap)
  // para ter controle total sobre os listeners da tabela
  view.innerHTML = `
    <div class="page-head">
      <div><h2>Motoristas</h2><p class="sub">Equipe de entregas, vínculos e PINs de acesso</p></div>
      <button class="btn btn-primary" id="btn-new-mot">+ Novo motorista</button>
    </div>
    <div class="toolbar">
      <div class="search"><input id="mot-search" placeholder="Buscar..." /></div>
    </div>
    <div class="panel"><div class="panel-body flush">
      <div class="table-wrap"><table class="data" id="mot-table">
        <thead><tr>
          <th>Nome</th><th>Contato</th><th>Vínculo</th>
          <th>PIN de acesso</th><th></th>
        </tr></thead>
        <tbody id="mot-tbody"></tbody>
      </table></div>
    </div></div>`;

  $("#btn-new-mot").onclick = ()=> form();

  function pinAleatorio(){ return String(Math.floor(1000 + Math.random()*9000)); }

  // Delega todos os cliques da tbody num único listener — nunca perde referência
  const tbody = $("#mot-tbody");
  tbody.addEventListener("click", async e=>{
    // Olhinho — revelar/ocultar PIN
    if(e.target.closest(".btn-ver-pin")){
      const btn  = e.target.closest(".btn-ver-pin");
      const span = btn.closest("tr").querySelector(".pin-mascarado");
      const visivel = span.dataset.visivel === "1";
      span.textContent    = visivel ? "••••" : span.dataset.pin;
      span.dataset.visivel= visivel ? "0" : "1";
      btn.textContent     = visivel ? "👁️" : "🙈";
      return;
    }
    // Editar
    if(e.target.closest("[data-edit-mot]")){
      const id = e.target.closest("[data-edit-mot]").dataset.editMot;
      const lista = await Store.list("motoristas");
      form(lista.find(x=>x.id===id));
      return;
    }
    // Excluir
    if(e.target.closest("[data-del-mot]")){
      const id = e.target.closest("[data-del-mot]").dataset.delMot;
      if(confirm("Excluir este motorista?")){
        await Store.remove("motoristas", id);
        toast("Motorista excluído");
      }
      return;
    }
  });

  Store.watch("motoristas", lista=>{
    const q = ($("#mot-search")?.value||"").toLowerCase();
    const filtrada = q ? lista.filter(m=>(m.nome+m.contato+m.vinculo).toLowerCase().includes(q)) : lista;

    tbody.innerHTML = filtrada.map(m=>`
      <tr>
        <td><strong>${esc(m.nome)}</strong></td>
        <td>${esc(m.contato||"—")}</td>
        <td><span class="badge badge-muted">${esc(m.vinculo||"—")}</span></td>
        <td style="white-space:nowrap">
          <span class="pin-mascarado" data-pin="${esc(m.pin||"—")}" data-visivel="0"
            style="font-size:18px;font-weight:800;letter-spacing:6px;vertical-align:middle">••••</span>
          <button class="btn-icon btn-ver-pin" title="Revelar PIN" style="vertical-align:middle">👁️</button>
        </td>
        <td class="text-right">
          <button class="btn-icon" data-edit-mot="${m.id}">✏️</button>
          <button class="btn-icon" data-del-mot="${m.id}">🗑️</button>
        </td>
      </tr>`).join("") ||
      `<tr><td colspan="5" class="text-muted" style="padding:24px;text-align:center">Nenhum motorista cadastrado.</td></tr>`;
  });

  $("#mot-search").oninput = ()=> Store.watch("motoristas", ()=>{});  // força re-render via watch já ativo
  // Re-busca simples: filtra no DOM
  $("#mot-search").oninput = e=>{
    const q = e.target.value.toLowerCase();
    tbody.querySelectorAll("tr").forEach(tr=>
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? "" : "none"
    );
  };

  function form(m={}){
    const pinInicial = m.pin || pinAleatorio();
    openModal(m.id ? "Editar motorista" : "Novo motorista", `
      <div class="form-grid">
        <div class="field full"><label>Nome</label>
          <input id="m-nome" value="${esc(m.nome||"")}"></div>
        <div class="field"><label>Contato / WhatsApp</label>
          <input id="m-cont" value="${esc(m.contato||"")}"></div>
        <div class="field"><label>Tipo de vínculo</label>
          <select id="m-vinc">
            ${["Fixo","Avulso","Opção A","Opção B"].map(v=>`<option ${m.vinculo===v?"selected":""}>${v}</option>`).join("")}
          </select></div>

        <div class="field full" style="border-top:1px solid var(--line);padding-top:16px;margin-top:4px">
          <label style="color:var(--brand);font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">
            🔐 PIN de acesso ao App do Motorista
          </label>
          <div style="display:flex;gap:12px;margin-top:10px;align-items:center;flex-wrap:wrap">
            <input id="m-pin" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}"
              value="${esc(pinInicial)}"
              style="font-size:32px;font-weight:800;letter-spacing:14px;text-align:center;
                     width:150px;border:2px solid var(--brand);border-radius:10px;padding:12px 8px">
            <div style="display:flex;flex-direction:column;gap:8px">
              <button class="btn btn-ghost btn-sm" id="m-ver-pin" type="button">👁️ Mostrar</button>
              <button class="btn btn-primary btn-sm" id="m-gerar-pin" type="button">🎲 Gerar novo</button>
            </div>
          </div>
          <p style="font-size:12px;color:var(--muted);margin-top:12px;line-height:1.5">
            O motorista usa este código de 4 dígitos para entrar no app.<br>
            Preencha o contato acima e envie o PIN + link de acesso pelo WhatsApp.
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
            <button class="btn btn-primary btn-sm" id="m-wa-pin" type="button">
              💬 Enviar no WhatsApp
            </button>
            <button class="btn btn-ghost btn-sm" id="m-copiar-pin" type="button">
              📋 Copiar mensagem
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
          <button class="btn btn-primary" id="m-save">Salvar</button>
        </div>
      </div>`);

    const pinInput = $("#m-pin");
    let pinVisivel = true;

    // Só números, máximo 4
    pinInput.addEventListener("input", ()=>{
      pinInput.value = pinInput.value.replace(/\D/g,"").slice(0,4);
    });

    // Mostrar / ocultar
    $("#m-ver-pin").addEventListener("click", ()=>{
      pinVisivel = !pinVisivel;
      pinInput.type = pinVisivel ? "text" : "password";
      $("#m-ver-pin").textContent = pinVisivel ? "👁️ Mostrar" : "🙈 Ocultar";
    });

    // Gerar novo PIN
    $("#m-gerar-pin").addEventListener("click", ()=>{
      pinInput.value = pinAleatorio();
      pinInput.type  = "text";
      pinVisivel = true;
      $("#m-ver-pin").textContent = "👁️ Mostrar";
      toast("Novo PIN gerado — salve para confirmar");
    });

    // Monta a mensagem com PIN + link de acesso ao app do motorista
    function montarMensagem(){
      const nome = $("#m-nome").value.trim() || "Motorista";
      const pin  = pinInput.value.trim();
      if(!/^\d{4}$/.test(pin)){ toast("Gere ou informe um PIN válido antes de enviar", true); return null; }
      const link = new URL("motorista.html", location.href).href;
      return `Olá ${nome}! 👋\n\nSeu acesso ao App do Motorista MedConnect:\n\n🔗 Link: ${link}\n🔐 PIN: *${pin}*\n\nÉ só abrir o link e digitar o PIN para entrar. Bom trabalho! 🚚`;
    }

    // Enviar direto no WhatsApp (abre o wa.me com o número do motorista, se houver)
    $("#m-wa-pin").addEventListener("click", ()=>{
      const txt = montarMensagem();
      if(!txt) return;
      const fone = ($("#m-cont").value||"").replace(/\D/g,"");
      const numero = fone ? (fone.length <= 11 ? "55"+fone : fone) : "";
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(txt)}`;
      window.open(url, "_blank");
    });

    // Copiar mensagem (fallback)
    $("#m-copiar-pin").addEventListener("click", ()=>{
      const txt = montarMensagem();
      if(!txt) return;
      navigator.clipboard?.writeText(txt)
        .then(()=> toast("Mensagem copiada — cole no WhatsApp ✓"))
        .catch(()=> prompt("Copie e envie ao motorista:", txt));
    });

    // Cancelar
    $("#m-cancel").addEventListener("click", closeModal);

    // Salvar
    $("#m-save").addEventListener("click", async ()=>{
      const nome = $("#m-nome").value.trim();
      const pin  = pinInput.value.trim();
      if(!nome)               return toast("Informe o nome do motorista", true);
      if(!/^\d{4}$/.test(pin)) return toast("O PIN deve ter exatamente 4 números", true);
      const todos     = await Store.list("motoristas");
      const duplicado = todos.find(x=> x.pin === pin && x.id !== m.id);
      if(duplicado) return toast(`PIN ${pin} já está em uso por ${duplicado.nome}`, true);

      const data = {
        nome, contato: $("#m-cont").value.trim(),
        vinculo: $("#m-vinc").value, pin
      };
      if(m.id) await Store.update("motoristas", m.id, data);
      else     await Store.add("motoristas", data);
      closeModal();
      toast(`Motorista salvo · PIN: ${pin}`);
    });
  }
}

/* ===================== FORNECEDORES ===================== */
export async function renderFornecedores(view){
  pageWrap(view,"Fornecedores / Parceiros","Gestão de sublocação de equipamentos externos","Novo parceiro",()=>form());
  Store.watch("fornecedores", lista=>{lista = [...lista].sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt-BR"));
    $("#list").innerHTML = tabela({
      head:["Nome","Contato","Equipamentos",""],
      rows: lista.map(f=>`
        <tr><td><strong>${esc(f.nome)}</strong></td><td>${esc(f.contato||"—")}</td>
        <td>${esc(f.equipamentos||"—")}</td>
        <td class="text-right"><button class="btn-icon" data-edit="${f.id}">✏️</button>
        <button class="btn-icon" data-del="${f.id}">🗑️</button></td></tr>`).join("")
    });
    bindRowActions("fornecedores", lista, form);
  });
  function form(f={}){
    openModal(f.id?"Editar parceiro":"Novo parceiro",`
      <div class="form-grid">
        <div class="field full"><label>Nome</label><input id="f-nome" value="${esc(f.nome||"")}"></div>
        <div class="field"><label>Contato</label><input id="f-cont" value="${esc(f.contato||"")}"></div>
        <div class="field full"><label>Equipamentos disponíveis</label><input id="f-eq" value="${esc(f.equipamentos||"")}"></div>
        <div class="form-actions"><button class="btn btn-ghost" id="f-cancel">Cancelar</button>
        <button class="btn btn-primary" id="f-save">Salvar</button></div>
      </div>`);
    $("#f-cancel").onclick=closeModal;
    $("#f-save").onclick=async()=>{
      const data={nome:$("#f-nome").value.trim(),contato:$("#f-cont").value.trim(),equipamentos:$("#f-eq").value.trim()};
      if(!data.nome) return toast("Informe o nome",true);
      if(f.id) await Store.update("fornecedores",f.id,data); else await Store.add("fornecedores",data);
      closeModal(); toast("Parceiro salvo");
    };
  }
}

/* ===================== EQUIPAMENTOS ===================== */
export async function renderEquipamentos(view){
  pageWrap(view,"Equipamentos","Frota própria e sublocada","Novo equipamento",()=>form());
  Store.watch("equipamentos", lista=>{lista = [...lista].sort((a,b)=>(a.modelo||"").localeCompare(b.modelo||"","pt-BR"));
    $("#list").innerHTML = tabela({
      head:["Modelo","Série","QR Code","Tecnologia","Frota","Acessórios",""],
      rows: lista.map(e=>`
        <tr>
          <td><strong>${esc(e.modelo)}</strong></td>
          <td class="mono">${esc(e.serie||"—")}</td>
          <td class="mono">${esc(e.qr||"—")}</td>
          <td><span class="badge badge-info">${esc(e.tecnologia)}</span></td>
          <td>${e.frota==="sublocado"?'<span class="badge badge-subloc">Sublocado</span>':'<span class="badge badge-frota">Própria</span>'}</td>
          <td style="max-width:280px;font-size:12px" class="text-muted">${esc(e.acessorios||"—")}</td>
          <td class="text-right"><button class="btn-icon" data-edit="${e.id}">✏️</button>
          <button class="btn-icon" data-del="${e.id}">🗑️</button></td>
        </tr>`).join("")
    });
    bindRowActions("equipamentos", lista, form);
  });
  function form(e={}){
    openModal(e.id?"Editar equipamento":"Novo equipamento",`
      <div class="form-grid">
        <div class="field full"><label>Modelo / Aplicação</label><input id="e-mod" value="${esc(e.modelo||"")}" placeholder="Ex.: Laser CO2 (Rejuvenescimento)"></div>
        <div class="field"><label>Número de série</label><input id="e-ser" value="${esc(e.serie||"")}"></div>
        <div class="field"><label>Código QR</label><input id="e-qr" value="${esc(e.qr||"")}"></div>
        <div class="field"><label>Tecnologia</label>
          <select id="e-tec">${["Laser CO2","Qclean","Smart","Lavieen","Deep","MTZ40","Outra"].map(t=>`<option ${e.tecnologia===t?"selected":""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label>Frota</label>
          <select id="e-frota"><option value="propria" ${e.frota!=="sublocado"?"selected":""}>Própria</option><option value="sublocado" ${e.frota==="sublocado"?"selected":""}>Sublocada</option></select></div>
        <div class="field full"><label>Acessórios inclusos</label><textarea id="e-ac" rows="2">${esc(e.acessorios||"")}</textarea></div>
        <div class="form-actions"><button class="btn btn-ghost" id="e-cancel">Cancelar</button>
        <button class="btn btn-primary" id="e-save">Salvar</button></div>
      </div>`);
    $("#e-cancel").onclick=closeModal;
    $("#e-save").onclick=async()=>{
      const data={modelo:$("#e-mod").value.trim(),serie:$("#e-ser").value.trim(),qr:$("#e-qr").value.trim(),
        tecnologia:$("#e-tec").value,frota:$("#e-frota").value,acessorios:$("#e-ac").value.trim()};
      if(!data.modelo) return toast("Informe o modelo",true);
      if(e.id) await Store.update("equipamentos",e.id,data); else await Store.add("equipamentos",data);
      closeModal(); toast("Equipamento salvo");
    };
  }
}

/* ---------- Ações comuns de linha (editar/excluir) ---------- */
function bindRowActions(col, lista, formFn){
  document.querySelectorAll("[data-edit]").forEach(b=> b.onclick=()=>{
    formFn(lista.find(x=> x.id === b.dataset.edit));
  });
  document.querySelectorAll("[data-del]").forEach(b=> b.onclick=async()=>{
    if(confirm("Excluir este registro?")){ await Store.remove(col, b.dataset.del); toast("Excluído"); }
  });
}
