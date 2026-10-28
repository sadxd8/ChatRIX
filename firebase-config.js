// ChatRIX Firebase configuration
// Replace every value below with your Firebase Web App config.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1_hSc1EzR8LZzMTpcvnRvLsJyfeXzvbc",
  authDomain: "chatrix-b1173.firebaseapp.com",
  projectId: "chatrix-b1173",
  storageBucket: "chatrix-b1173.firebasestorage.app",
  messagingSenderId: "550224627068",
  appId: "1:550224627068:web:c8a306172861e9054050f9",
  measurementId: "G-BP4HJ81YTR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
