// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAtlIYcdeq__YiJCE2QwxjDbYCu9gmfJgk",
    authDomain: "user-login-7b442.firebaseapp.com",
    projectId: "user-login-7b442",
    storageBucket: "user-login-7b442.firebasestorage.app",
    messagingSenderId: "435947570341",
    appId: "1:435947570341:web:0e7e37998d4fb14ff7794c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Get form elements

const submit = document.getElementById('signup');
submit.addEventListener("click", function (event) {
    event.preventDefault()
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Signed up 
            const user = userCredential.user;
            alert("creating account ....,")
            window.location.href = "user-login.html";
            // ...
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert

            // ..
        });

})