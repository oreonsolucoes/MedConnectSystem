/* ===================================================================
   Upload de Fotos/Vídeos → Google Drive (via Google Apps Script)
   -------------------------------------------------------------------
   Como um site estático (GitHub Pages) não pode guardar credenciais
   secretas, o upload real é feito por um Google Apps Script publicado
   como "Web App" na SUA conta Google. O celular envia o arquivo em
   base64 para essa URL, e o script salva na pasta do Drive.

   >>> Enquanto DRIVE_WEBAPP_URL estiver vazio, o sistema opera em MODO
       SIMULADO: mostra as miniaturas e finge o upload, para você ver a
       experiência completa sem configurar nada.

   PASSO A PASSO (arquivo apps-script/Code.gs acompanha o projeto):
   1. Acesse https://script.google.com  → Novo projeto
   2. Cole o conteúdo de apps-script/Code.gs
   3. Troque PASTA_RAIZ_ID pelo ID da pasta do seu Drive
   4. Implantar → Nova implantação → Tipo: App da Web
      - Executar como: Eu
      - Quem tem acesso: Qualquer pessoa
   5. Copie a URL gerada e cole abaixo em DRIVE_WEBAPP_URL
   =================================================================== */

export const DRIVE_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbz7YyjHjHJjg4FHP5-0DFNW2gLZ1s3Awb4XN7Ud7CfVQ5hwC2AKEsyFE-nNXx5WGLMBYg/exec"; // ← cole aqui a URL do seu Apps Script

export const MODO_SIMULADO = !DRIVE_WEBAPP_URL;

/** Lê um File e devolve base64 (sem o prefixo data:) */
function fileToBase64(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=> res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/** Miniatura/preview local imediato (não depende do upload) */
export function previewURL(file){ return URL.createObjectURL(file); }

/**
 * Faz upload de UM arquivo para a pasta da locação.
 * Estrutura no Drive:
 *   📁 [Pasta raiz]
 *     └── 📁 Cliente - DD-MM-AAAA
 *           ├── 📁 entrega
 *           └── 📁 retirada
 *
 * @returns {Promise<{ok:boolean, url?:string, nome:string, simulado?:boolean, erro?:string}>}
 */
export async function enviarArquivo(file, { locId, cliente, data, fase }){
  // Formata a data de "2026-04-04" para "04-04-2026"
  const dataFmt = data
    ? data.split("-").reverse().join("-")   // "2026-04-04" → "04-04-2026"
    : new Date().toLocaleDateString("pt-BR").replace(/\//g,"-");

  const nomePasta = `${(cliente||"Cliente").trim()} - ${dataFmt}`;

  // Modo simulado — retorna sucesso "fake" com preview local
  if (MODO_SIMULADO){
    await new Promise(r=> setTimeout(r, 500));
    return { ok:true, simulado:true, nome:file.name, url:previewURL(file), pasta:nomePasta };
  }

  try {
    const base64 = await fileToBase64(file);
    const payload = {
      arquivo:  base64,
      nome:     file.name,
      mimeType: file.type,
      pasta:    nomePasta,            // "Dra Priscila Betoni - 04-04-2026"
      fase:     fase || "entrega"     // subpasta dentro: entrega / retirada
    };
    const resp = await fetch(DRIVE_WEBAPP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" } // evita preflight CORS
    });
    const json = await resp.json();
    if (json.ok) return { ok:true, url:json.url, nome:file.name, pasta:nomePasta };
    return { ok:false, nome:file.name, erro:json.erro || "Falha no upload" };
  } catch (e){
    return { ok:false, nome:file.name, erro:e.message };
  }
}

/** Faz upload de vários arquivos em sequência, com callback de progresso */
export async function enviarVarios(files, ctx, onProgress){
  const resultados = [];
  for (let i=0; i<files.length; i++){
    onProgress && onProgress(i, files.length, files[i].name);
    resultados.push(await enviarArquivo(files[i], ctx));
  }
  onProgress && onProgress(files.length, files.length, "");
  return resultados;
}
