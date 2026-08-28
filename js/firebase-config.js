import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
