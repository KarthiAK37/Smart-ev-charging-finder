// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

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

// Debugging log to confirm the script is loaded
console.log("station-login.js loaded");

const loginButton = document.getElementById('login');
loginButton.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent default form submission
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Debugging logs
    console.log("Login button clicked");
    console.log("Email:", email);
    console.log("Password:", password);

    if (!email || !password) {
        alert("Please fill in both email and password fields.");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("User signed in:", user);
            alert("Logging in...");
            window.location.href = "station-dashboard.html"; // Redirect to station dashboard
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Error signing in:", errorCode, errorMessage);
            alert(`Error: ${errorMessage}`);
        });
});