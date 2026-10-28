import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const notice = $("notice");
function showError(error) {
  console.error(error);
  notice.textContent = error.code ? `${error.code}: ${error.message}` : error.message;
}
// Only auto-redirect on the login page. On signup, wait until the profile
// and username reservation have been written before navigating to chat.html.
if ($("loginForm")) {
  onAuthStateChanged(auth, user => {
    if (user) location.replace("chat.html");
  });
}

const loginForm = $("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();
    const btn = $("loginBtn");
    btn.disabled = true; notice.textContent = "Signing in…";
    try {
      await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
      location.replace("chat.html");
    } catch (error) { showError(error); }
    finally { btn.disabled = false; }
  });
}

const signupForm = $("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async event => {
    event.preventDefault();
    const btn = $("signupBtn");
    const username = $("username").value.trim().toLowerCase();
    const name = $("name").value.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      notice.textContent = "Username must be 3–20 characters (a-z, 0-9, underscore)."; return;
    }
    btn.disabled = true; notice.textContent = "Creating your account…";
    let createdUser = null;
    try {
      const credential = await createUserWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
      createdUser = credential.user;
      // Reserve usernames transactionally so two accounts cannot claim the same handle.
      await runTransaction(db, async tx => {
        const usernameRef = doc(db, "usernames", username);
        const existing = await tx.get(usernameRef);
        if (existing.exists()) throw new Error("That username is already taken. Try another one.");
        tx.set(usernameRef, { uid: createdUser.uid, username, createdAt: serverTimestamp() });
        tx.set(doc(db, "users", createdUser.uid), {
          uid: createdUser.uid, username, name, email: createdUser.email,
          createdAt: serverTimestamp()
        });
      });
      await updateProfile(createdUser, { displayName: name });
      location.replace("chat.html");
    } catch (error) {
      // If the profile transaction fails, the Auth account may already exist.
      showError(error);
      if (createdUser && error.message.includes("already taken")) {
        notice.textContent += " If needed, sign in and finish profile setup.";
      }
    } finally { btn.disabled = false; }
  });
}
