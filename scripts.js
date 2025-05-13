import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAtlIYcdeq__YiJCE2QwxjDbYCu9gmfJgk",
  authDomain: "user-login-7b442.firebaseapp.com",
  databaseURL: "https://user-login-7b442-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "user-login-7b442",
  storageBucket: "user-login-7b442.firebasestorage.app",
  messagingSenderId: "435947570341",
  appId: "1:435947570341:web:0e7e37998d4fb14ff7794c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Detect if user is logged in
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const userRef = doc(db, "user details", uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("name").value = data.Name || "";
      document.getElementById("email").value = data.mail || "";
      document.getElementById("phone").value = data.phoneNo || "";
    } else {
      alert("No data found for this user.");
    }

    // Save button updates Firestore
    document.querySelector("button").onclick = async () => {
      const updatedData = {
        Name: document.getElementById("name").value,
        mail: document.getElementById("email").value,
        phoneNo: document.getElementById("phone").value,
      };
      try {
        await updateDoc(userRef, updatedData);
        alert("Profile updated successfully!");
      } catch (error) {
        console.error("Update error:", error);
        alert("Update failed.");
      }
    };

  } else {
    alert("User not logged in.");
    // Redirect to login page if needed
  }
});
