// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASmbOcKXv_Qnv2RcSAh7_1liSymK7mivE",
  authDomain: "ev-station-53039.firebaseapp.com",
  projectId: "ev-station-53039",
  storageBucket: "ev-station-53039.firebasestorage.app",
  messagingSenderId: "326684639247",
  appId: "1:326684639247:web:214f401926b7a9c275237a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Get form elements
const signupButton = document.getElementById('signup');
signupButton.addEventListener("click", function (event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Please fill in both email and password fields.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            alert("Account created successfully!");
            window.location.href = "station-login.html";
        })
        .catch((error) => {
            const errorMessage = error.message;
            alert(`Error: ${errorMessage}`);
        });
});