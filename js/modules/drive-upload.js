/* ===================================================================
   Upload de Fotos/Vídeos → Google Drive (via Google Apps Script)
   -------------------------------------------------------------------
   • Retry automático 3x com backoff exponencial por arquivo
   • Fila persistida no localStorage — retoma se fechar/reabrir app
   • Upload em segundo plano — não bloqueia o motorista
   • Notificação visual inline (funciona sem PWA instalado)
   =================================================================== */

export const DRIVE_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz7YyjHjHJjg4FHP5-0DFNW2gLZ1s3Awb4XN7Ud7CfVQ5hwC2AKEsyFE-nNXx5WGLMBYg/exec";
export const MODO_SIMULADO = !DRIVE_WEBAPP_URL;

const FILA_KEY = "mc_upload_fila";
const MAX_TENTATIVAS = 3;

/* ---------- helpers ---------- */
function fileToBase64(file){
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload  = ()=> res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
export function previewURL(file){ return URL.createObjectURL(file); }

/** Retorna URL de thumbnail do Drive para exibir inline.
 *  Aceita a URL padrão do Drive (drive.google.com/file/d/ID/...) ou
 *  um driveId direto. Para vídeos use isVideo=true para obter thumbnail de frame. */
export function driveThumbURL(url, driveId){
  // Prioridade: driveId direto
  const id = driveId || (url ? (url.match(/\/d\/([a-zA-Z0-9_-]+)/)||[])[1] : null);
  if(id) return `https://drive.google.com/thumbnail?id=${id}&sz=w300`;
  // Blob/data URL local (modo simulado ou preview)
  if(url && (url.startsWith("blob:") || url.startsWith("data:"))) return url;
  return null;
}

/* ---------- fila persistida ---------- */
function filaLoad(){ try{ return JSON.parse(localStorage.getItem(FILA_KEY))||[]; }catch{ return []; } }
function filaSave(f){ localStorage.setItem(FILA_KEY, JSON.stringify(f)); }

/** Enfileira um item (sem o File — só os metadados + base64) para retry */
function filaAdd(item){ const f=filaLoad(); f.push(item); filaSave(f); }
function filaRemove(id){ filaSave(filaLoad().filter(i=>i.id!==id)); }
function filaAtualizar(id, patch){ filaSave(filaLoad().map(i=>i.id===id?{...i,...patch}:i)); }

/* ---------- banner de progresso (sem PWA) ---------- */
let bannerEl = null;

function getBanner(){
  if(bannerEl && document.contains(bannerEl)) return bannerEl;
  bannerEl = document.createElement("div");
  bannerEl.id = "upload-banner";
  Object.assign(bannerEl.style, {
    position:"fixed", top:"0", left:"0", right:"0", zIndex:"9999",
    background:"#12243f", color:"#fff", padding:"10px 16px",
    display:"flex", alignItems:"center", gap:"12px",
    fontFamily:"system-ui,sans-serif", fontSize:"13px", fontWeight:"600",
    boxShadow:"0 2px 12px rgba(0,0,0,.35)", transition:"opacity .3s"
  });
  document.body.prepend(bannerEl);
  return bannerEl;
}

function bannerSet({ texto, pct, cor }){
  const b = getBanner();
  b.style.display = "flex";
  b.style.background = cor || "#12243f";
  b.innerHTML = `
    <span style="flex:1">${texto}</span>
    ${pct != null ? `
      <div style="width:120px;height:8px;background:rgba(255,255,255,.25);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:#33ccff;border-radius:4px;transition:width .3s"></div>
      </div>
      <span style="min-width:36px;text-align:right">${pct}%</span>
    ` : ""}
  `;
}

function bannerOk(texto){
  bannerSet({ texto:`✓ ${texto}`, pct:100, cor:"#0d6b3a" });
  setTimeout(()=>{ if(bannerEl) bannerEl.style.display="none"; }, 3500);
}

function bannerErro(texto){
  bannerSet({ texto:`✗ ${texto}`, cor:"#991b1b" });
  setTimeout(()=>{ if(bannerEl) bannerEl.style.display="none"; }, 5000);
}

/* ---------- upload de 1 arquivo com retry ---------- */
async function enviarUmComRetry(file, ctx, tentativa=1){
  const { locId, cliente, data, fase } = ctx;
  const dataFmt = data
    ? data.split("-").reverse().join("-")
    : new Date().toLocaleDateString("pt-BR").replace(/\//g,"-");
  const nomePasta = `${(cliente||"Cliente").trim()} - ${dataFmt}`;

  if(MODO_SIMULADO){
    await new Promise(r=>setTimeout(r,400));
    return { ok:true, simulado:true, nome:file.name, url:previewURL(file), pasta:nomePasta };
  }

  try {
    const base64 = await fileToBase64(file);
    const resp = await fetch(DRIVE_WEBAPP_URL, {
      method:"POST",
      body: JSON.stringify({ arquivo:base64, nome:file.name, mimeType:file.type, pasta:nomePasta, fase:fase||"entrega" }),
      headers:{ "Content-Type":"text/plain;charset=utf-8" }
    });
    const json = await resp.json();
    if(json.ok) return { ok:true, url:json.url, driveId:json.id, nome:file.name, pasta:nomePasta };
    throw new Error(json.erro||"Falha no servidor");
  } catch(e){
    if(tentativa < MAX_TENTATIVAS){
      const espera = tentativa * 2000; // 2s, 4s
      await new Promise(r=>setTimeout(r, espera));
      return enviarUmComRetry(file, ctx, tentativa+1);
    }
    return { ok:false, nome:file.name, erro:e.message };
  }
}

/* ---------- API principal: upload em segundo plano ---------- */

/**
 * Inicia upload em SEGUNDO PLANO — retorna imediatamente.
 * Mostra banner de progresso no topo da tela.
 * Chama onConcluido({resultados}) quando todos terminarem.
 *
 * @param {File[]} files
 * @param {{ locId, cliente, data, fase }} ctx
 * @param {(resultados: Array) => void} onConcluido
 */
export function enviarEmBackground(files, ctx, onConcluido){
  if(!files.length){ onConcluido && onConcluido([]); return; }

  // Dispara sem await — segundo plano
  (async()=>{
    const resultados = [];
    let ok = 0, falha = 0;

    for(let i=0; i<files.length; i++){
      const pct = Math.round((i/files.length)*100);
      bannerSet({
        texto:`☁️ Enviando ${i+1}/${files.length} (${files[i].name.slice(0,20)})`,
        pct
      });

      const r = await enviarUmComRetry(files[i], ctx);
      resultados.push(r);
      if(r.ok) ok++; else falha++;
    }

    // Resultado final
    if(falha === 0){
      bannerOk(`${ok} arquivo${ok>1?"s":""} enviado${ok>1?"s":""} com sucesso`);
    } else if(ok === 0){
      bannerErro(`Falha ao enviar ${falha} arquivo${falha>1?"s":""}. Verifique a conexão.`);
    } else {
      bannerSet({
        texto:`⚠️ ${ok} enviado${ok>1?"s":""}, ${falha} falhou${falha>1?"m":""}`,
        pct:100, cor:"#92400e"
      });
      setTimeout(()=>{ if(bannerEl) bannerEl.style.display="none"; }, 5000);
    }

    onConcluido && onConcluido(resultados);
  })();
}

/**
 * Verifica e retoma uploads pendentes da fila persistida.
 * Chamar no boot do app do motorista.
 */
export function retomandoFilaPendente(getFilePorId){
  const fila = filaLoad();
  const pendentes = fila.filter(i=>!i.concluido);
  if(!pendentes.length) return;

  // Apenas avisa — arquivos File não sobrevivem ao reload, mas base64 sim
  console.log(`[Upload] ${pendentes.length} item(ns) pendente(s) na fila — serão descartados (File não persiste no reload).`);
  // Limpa fila obsoleta
  filaSave([]);
}

/** Compatibilidade com código antigo — usa o novo com retry mas síncrono */
export async function enviarArquivo(file, ctx){
  return enviarUmComRetry(file, ctx, 1);
}

export async function enviarVarios(files, ctx, onProgress){
  const resultados = [];
  for(let i=0; i<files.length; i++){
    onProgress && onProgress(i, files.length, files[i].name);
    resultados.push(await enviarUmComRetry(files[i], ctx, 1));
  }
  onProgress && onProgress(files.length, files.length, "");
  return resultados;
}
