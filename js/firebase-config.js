import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const USE_FIREBASE = true;

const firebaseConfig = {
  apiKey: "AIzaSyBAt7gHv0EBES4ZHbfZN0fhnQGBTjqMXog",
  authDomain: "medconnect-36c91.firebaseapp.com",
  projectId: "medconnect-36c91",
  storageBucket: "medconnect-36c91.firebasestorage.app",
  messagingSenderId: "587460819432",
  appId: "1:587460819432:web:d4494a581de6316ce94c5d"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

/* =====================================================================
   PERSISTÊNCIA OFFLINE — Firestore IndexedDB
   - Dados da última sessão ficam em cache local
   - Leituras servem do cache quando offline
   - Gravações ficam em fila e sincronizam quando a internet voltar
   ===================================================================== */
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === "failed-precondition") {
    // Múltiplas abas abertas — persistência só funciona em uma aba por vez
    console.warn("[Offline] Persistência não ativada: múltiplas abas abertas.");
  } else if (err.code === "unimplemented") {
    // Navegador não suporta (ex: Safari antigo)
    console.warn("[Offline] Navegador não suporta persistência offline.");
  }
});
