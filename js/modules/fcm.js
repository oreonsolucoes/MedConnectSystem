/* ===================================================================
   MedConnect · FCM (Firebase Cloud Messaging)
   -------------------------------------------------------------------
   Registra o dispositivo do motorista para receber push notifications
   nativas no Android — funciona com app fechado ou em background.

   COMO FUNCIONA:
   1. Ao fazer login, pedimos permissão de notificação ao usuário
   2. Obtemos o FCM token deste dispositivo
   3. Salvamos o token no Firestore em motoristas/{id}/fcmTokens
   4. A Cloud Function lê esse token ao criar/alterar entregas e
      envia o push via FCM Admin SDK

   SETUP (único, feito uma vez no Firebase Console):
   Ver instruções no final deste arquivo.
   =================================================================== */

import { app } from "../firebase-config.js";

/* ── VAPID key pública — obtida no Firebase Console ──
   Console → Project Settings → Cloud Messaging → Web Push certificates
   Clique em "Generate key pair" e cole aqui a chave pública */
const VAPID_KEY = "COLE_AQUI_SUA_VAPID_KEY_PUBLICA";

let messaging = null;

async function getMessaging(){
  if(messaging) return messaging;
  const { getMessaging: gM } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"
  );
  messaging = gM(app);
  return messaging;
}

/**
 * Pede permissão, obtém o FCM token e salva no Firestore.
 * Chamar logo após o login do motorista.
 *
 * @param {string} motoristaId  — id do documento em /motoristas
 * @param {object} db           — instância do Firestore
 */
export async function registrarFCM(motoristaId, db){
  // Sem VAPID configurada: apenas avisa no console, não quebra o app
  if(!VAPID_KEY || VAPID_KEY.startsWith("COLE")){
    console.info("[FCM] VAPID key não configurada — notificações push desativadas.");
    return null;
  }

  // Verifica suporte
  if(!("Notification" in window) || !("serviceWorker" in navigator)){
    console.info("[FCM] Navegador não suporta notificações.");
    return null;
  }

  try {
    // Pede permissão (mostra dialog nativo do Android)
    const perm = await Notification.requestPermission();
    if(perm !== "granted"){
      console.info("[FCM] Permissão negada pelo usuário.");
      return null;
    }

    const msg = await getMessaging();

    // Obtém o token deste dispositivo
    const { getToken } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"
    );
    const swReg = await navigator.serviceWorker.ready;
    const token = await getToken(msg, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });

    if(!token){ console.warn("[FCM] Token vazio."); return null; }

    // Salva o token no Firestore (arrayUnion para não duplicar)
    const { doc, updateDoc, arrayUnion } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
    );
    await updateDoc(doc(db, "motoristas", motoristaId), {
      fcmTokens: arrayUnion(token)
    });

    console.info("[FCM] Token registrado com sucesso.");
    return token;

  } catch(err){
    // Nunca quebra o app — FCM é opcional
    console.warn("[FCM] Erro ao registrar:", err.message);
    return null;
  }
}

/**
 * Remove o token FCM ao fazer logout (boa prática).
 */
export async function removerFCM(motoristaId, db){
  if(!VAPID_KEY || VAPID_KEY.startsWith("COLE")) return;
  try {
    const msg = await getMessaging();
    const { deleteToken } = await import(
      "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js"
    );
    await deleteToken(msg);
  } catch(e){ /* silencioso */ }
}

/* ===================================================================
   INSTRUÇÕES DE SETUP — faça isso uma vez

   1. ATIVAR FCM NO FIREBASE CONSOLE
      ─────────────────────────────────
      console.firebase.google.com → medconnect-36c91
      → Project Settings (⚙️) → Cloud Messaging
      → Confirme que "Firebase Cloud Messaging API (V1)" está ativada

   2. GERAR VAPID KEY
      ─────────────────────────────────
      Mesma tela → aba "Web configuration"
      → "Generate key pair" → copie a chave pública
      → Cole em VAPID_KEY acima

   3. CLOUD FUNCTION (envia o push quando entrega muda)
      ─────────────────────────────────
      Use o arquivo functions/index.js gerado separadamente.
      Deploy: firebase deploy --only functions

   4. PWABUILDER (gera o APK)
      ─────────────────────────────────
      a) Faça deploy desta versão no GitHub Pages
      b) Acesse pwabuilder.com
      c) Cole: https://oreonsolucoes.github.io/MedConnectSystem/motorista.html
      d) Clique "Package for stores" → Android → Download
      e) Instale o .apk nos celulares dos motoristas
         (Configurações → Instalar apps desconhecidos → permitir)
   =================================================================== */
