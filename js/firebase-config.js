/**
 * Firebase Configuration & Initialization
 * Marali Comunicaciones - Web Version
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, Timestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCw4P-z9Bt-ZNg_7HEHHQD1yxb3UBsp0XY",
  authDomain: "maralicomunicaciones-d8d30.firebaseapp.com",
  projectId: "maralicomunicaciones-d8d30",
  storageBucket: "maralicomunicaciones-d8d30.firebasestorage.app",
  messagingSenderId: "1055491260621",
  appId: "1:1055491260621:web:345c9c4dcd0ec51b3ca984",
  measurementId: "G-M5NZ6T267K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Firestore
// Habilitar persistencia local para mejor experiencia
try {
  db.enablePersistence()
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.log("Persistencia: múltiples tabs abiertos");
      } else if (err.code == 'unimplemented') {
        console.log("Navegador no soporta persistencia");
      }
    });
} catch (e) {
  console.log("Error habilitando persistencia:", e);
}

// Exportar servicios para usar en toda la app
export { app, auth, db, storage, analytics, Timestamp };
