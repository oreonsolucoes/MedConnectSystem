/* ===================================================================
   Firebase · Inicialização (Firestore + Auth + Analytics)
   -------------------------------------------------------------------
   1) Crie o projeto em https://console.firebase.google.com
   2) Ative Authentication (Email/Senha) e Firestore Database
   3) Cole abaixo as credenciais do seu app Web (⚙ > Configurações do projeto)
   4) O sistema funciona em modo DEMO (mock) mesmo sem credenciais reais —
      basta deixar USE_FIREBASE = false para testar tudo localmente.
   =================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

/* Troque para true depois de preencher as credenciais reais abaixo */
export const USE_FIREBASE = false;

const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "seu-projeto.firebaseapp.com",
  projectId:         "seu-projeto",
  storageBucket:     "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:xxxxxxxxxxxx",
  measurementId:     "G-XXXXXXXXXX"
};

export let app = null, auth = null, db = null;

if (USE_FIREBASE) {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(()=>{});
}
