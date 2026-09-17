/* ===================================================================
   Store — abstração de dados
   Se USE_FIREBASE = true → usa Firestore (CRUD + onSnapshot em tempo real)
   Se false               → usa mock em memória (mesma API, tempo real simulado)
   =================================================================== */

import { USE_FIREBASE, db } from "../firebase-config.js";
import * as mock from "./mock-data.js";

let fs = null;
if (USE_FIREBASE) {
  fs = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
}

/* ---------- Modo MOCK (persistido em localStorage + pub/sub) ---------- */
const LS_KEY = "mc_db_v2";

const seed = {
  clientes:     structuredClone(mock.clientes),
  motoristas:   structuredClone(mock.motoristas),
  fornecedores: structuredClone(mock.fornecedores),
  equipamentos: structuredClone(mock.equipamentos),
  locacoes:     structuredClone(mock.locacoes),
  despesas:     structuredClone(mock.despesas),
  responsaveis: structuredClone(mock.responsaveis || []),  // FIX: coleção ausente causava TDZ em locacoes.js
  checklists:   []
};

let memory;
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY));
  if (saved && saved.locacoes) {
    // FIX: migração — garante que coleções novas existam em dados salvos antigos
    if (!saved.responsaveis) saved.responsaveis = [];
    memory = saved;
  } else {
    memory = seed;
  }
} catch { memory = seed; }

const subscribers = {}; // coleção -> [callbacks]

function persist(){ try { localStorage.setItem(LS_KEY, JSON.stringify(memory)); } catch {} }
function notify(col){
  if (!memory[col]) return; // FIX: evita crash em coleção inexistente
  (subscribers[col]||[]).forEach(cb => cb([...memory[col]]));
}
function uid(){ return "id" + Math.random().toString(36).slice(2,9); }

/* Sincroniza entre abas/páginas */
if (!USE_FIREBASE && typeof window !== "undefined"){
  window.addEventListener("storage", e=>{
    if (e.key !== LS_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      // FIX: mantém coleção responsaveis na sync entre abas
      if (!parsed.responsaveis) parsed.responsaveis = [];
      memory = parsed;
      Object.keys(subscribers).forEach(col => notify(col));
    } catch {}
  });
  persist();
}

/* ---------- API pública ---------- */
export const Store = {

  /** Observa uma coleção em tempo real. Retorna função de unsubscribe. */
  watch(col, callback){
    if (USE_FIREBASE){
      const q = fs.collection(db, col);
      return fs.onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      });
    }
    // FIX: inicializa coleção se não existir (evita crash com dados legados)
    if (!memory[col]) memory[col] = [];
    (subscribers[col] ||= []).push(callback);
    callback([...memory[col]]);
    return () => { subscribers[col] = subscribers[col].filter(c => c !== callback); };
  },

  /** Leitura única */
  async list(col){
    if (USE_FIREBASE){
      const snap = await fs.getDocs(fs.collection(db, col));
      return snap.docs.map(d => ({ id:d.id, ...d.data() }));
    }
    // FIX: retorna [] em vez de lançar TypeError quando coleção não existe
    if (!memory[col]) memory[col] = [];
    return [...memory[col]];
  },

  async add(col, data){
    if (USE_FIREBASE){
      const ref = await fs.addDoc(fs.collection(db, col), data);
      return ref.id;
    }
    if (!memory[col]) memory[col] = []; // FIX: cria coleção on-the-fly
    const id = uid();
    memory[col].push({ id, ...data });
    persist(); notify(col);
    return id;
  },

  async update(col, id, data){
    if (USE_FIREBASE){
      await fs.updateDoc(fs.doc(db, col, id), data);
      return;
    }
    if (!memory[col]) return; // FIX: guard
    const i = memory[col].findIndex(x => x.id === id);
    if (i >= 0){ memory[col][i] = { ...memory[col][i], ...data }; persist(); notify(col); }
  },

  async remove(col, id){
    if (USE_FIREBASE){
      await fs.deleteDoc(fs.doc(db, col, id));
      return;
    }
    if (!memory[col]) return; // FIX: guard
    memory[col] = memory[col].filter(x => x.id !== id);
    persist(); notify(col);
  }
};
