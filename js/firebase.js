
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
  import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyAahkSCVNB3W8UWE-dxyfXSmpgPdcuiIzE",
    authDomain: "logiccraft-ai.firebaseapp.com",
    projectId: "logiccraft-ai",
    storageBucket: "logiccraft-ai.firebasestorage.app",
    messagingSenderId: "279513539834",
    appId: "1:279513539834:web:3e7ed40ec34b3667d85543",
    measurementId: "G-586XQK8SLH"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  
  const analytics = getAnalytics(app);

  

console.log("Firebase Loaded");

const loginBtn = document.getElementById("googleLogin");

if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, provider);

           const user = result.user;



localStorage.setItem(
    "logiccraftUser",
    JSON.stringify({
        googleId: user.uid,
        name: user.displayName,
        photo: user.photoURL
    })
);

alert("Welcome " + user.displayName);

window.location.href = "dashboard.html";

        } catch (error) {
            console.error(error);
            alert(error.code + "\n" + error.message);
        }
    });
}
