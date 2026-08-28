/* ===================================================================
   Notificações do Motorista
   -------------------------------------------------------------------
   Detecta alterações nas entregas atribuídas ao motorista (nova, alterada,
   removida) comparando o estado atual com um "snapshot" salvo localmente,
   e mantém um feed persistente por motorista.

   Regras de negócio (conforme definido):
   - Nova/alterada/removida entrega  → gera notificação + incrementa o sino.
   - Abrir o painel                  → marca todas como LIDAS (zera o sino),
                                        mas as notificações CONTINUAM na lista.
   - A notificação só é REMOVIDA da lista quando a entrega correspondente
     é concluída (checklist ok) ou excluída — e o motorista confirma "ok".
   =================================================================== */

const KEY_SNAP  = m => `mc_snap_${m}`;   // último estado conhecido das entregas
const KEY_FEED  = m => `mc_feed_${m}`;   // feed de notificações do motorista

function load(key, def){ try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

/** "Impressão digital" de uma entrega — muda se algum campo relevante mudar */
function fingerprint(l){
  return [l.data, l.horario, l.cliente, l.tecnologia, l.endereco||"", l.frota].join("|");
}

/**
 * Reconcilia o estado atual das entregas do motorista com o snapshot anterior.
 * Gera notificações novas e devolve { feed, unread }.
 * @param {string} motoristaNome
 * @param {Array}  entregas  locações já filtradas para este motorista
 */
export function reconciliar(motoristaNome, entregas){
  const snapAnterior = load(KEY_SNAP(motoristaNome), null);
  const feed = load(KEY_FEED(motoristaNome), []);

  const atual = {};
  entregas.forEach(l => { atual[l.id] = { fp:fingerprint(l), concluida:!!l.checklistOk }; });

  const agora = new Date().toISOString();
  const addNotif = (tipo, l, texto) => {
    // evita duplicar a mesma notificação não confirmada para a mesma entrega+tipo
    const existe = feed.find(n => n.locId===l.id && n.tipo===tipo && !n.confirmada);
    if (existe) return;
    feed.unshift({
      id: "n" + Math.random().toString(36).slice(2,9),
      locId: l.id, tipo, texto,
      cliente: l.cliente, data: l.data,
      quando: agora, lida:false, confirmada:false
    });
  };

  if (snapAnterior === null){
    // Primeira execução: registra estado sem floodar de notificações.
    save(KEY_SNAP(motoristaNome), atual);
    save(KEY_FEED(motoristaNome), feed);
    return { feed, unread: feed.filter(n=>!n.lida).length };
  }

  const idsAntes = Object.keys(snapAnterior);
  const idsAgora = Object.keys(atual);

  // NOVAS entregas
  idsAgora.filter(id => !snapAnterior[id]).forEach(id=>{
    const l = entregas.find(x=>x.id===id);
    addNotif("nova", l, `Nova entrega adicionada à sua rota: ${l.cliente}`);
  });

  // ALTERADAS
  idsAgora.filter(id => snapAnterior[id] && snapAnterior[id].fp !== atual[id].fp).forEach(id=>{
    const l = entregas.find(x=>x.id===id);
    addNotif("alterada", l, `Entrega alterada: ${l.cliente} (confira data/horário/local)`);
  });

  // REMOVIDAS da rota (não estão mais entre as entregas do motorista)
  idsAntes.filter(id => !atual[id]).forEach(id=>{
    const info = snapAnterior[id];
    // guarda referência mínima para exibir e permitir confirmação
    addNotif("removida", { id, cliente: info.cliente || "Entrega", data: info.data || "" },
      `Entrega removida da sua rota${info.cliente? ": "+info.cliente : ""}`);
  });

  // enriquece snapshot com cliente/data para o caso de remoção futura
  idsAgora.forEach(id=>{
    const l = entregas.find(x=>x.id===id);
    atual[id].cliente = l.cliente; atual[id].data = l.data;
  });

  save(KEY_SNAP(motoristaNome), atual);
  save(KEY_FEED(motoristaNome), feed);
  return { feed, unread: feed.filter(n=>!n.lida).length };
}

/** Marca todas como lidas (zera o sino) — mas mantém na lista */
export function marcarTodasLidas(motoristaNome){
  const feed = load(KEY_FEED(motoristaNome), []);
  feed.forEach(n => n.lida = true);
  save(KEY_FEED(motoristaNome), feed);
  return feed;
}

/**
 * Sincroniza o feed com o estado real das entregas: remove da lista as
 * notificações cujas entregas já foram CONCLUÍDAS (e o motorista confirmou),
 * ou EXCLUÍDAS/REMOVIDAS confirmadas. Chamada a cada render.
 */
export function limparResolvidas(motoristaNome, entregasAtuais){
  let feed = load(KEY_FEED(motoristaNome), []);
  const mapa = {}; entregasAtuais.forEach(l => mapa[l.id] = l);

  feed = feed.filter(n=>{
    const loc = mapa[n.locId];
    // Notificação de entrega ainda existente e NÃO concluída → mantém
    if (loc && !loc.checklistOk) return true;
    // Entrega concluída OU removida: só sai quando o motorista confirmar
    return !n.confirmada;
  });

  save(KEY_FEED(motoristaNome), feed);
  return feed;
}

/** Motorista confirma ("ok, lido") uma notificação de conclusão/remoção */
export function confirmarNotificacao(motoristaNome, notifId){
  const feed = load(KEY_FEED(motoristaNome), []);
  const n = feed.find(x=>x.id===notifId);
  if (n) n.confirmada = true;
  save(KEY_FEED(motoristaNome), feed);
  return feed;
}

export function getFeed(motoristaNome){ return load(KEY_FEED(motoristaNome), []); }
