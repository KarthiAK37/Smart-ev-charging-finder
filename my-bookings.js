import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAtlIYcdeq__YiJCE2QwxjDbYCu9gmfJgk",
    authDomain: "user-login-7b442.firebaseapp.com",
    databaseURL: "https://user-login-7b442-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "user-login-7b442",
    storageBucket: "user-login-7b442.firebasestorage.app",
    messagingSenderId: "435947570341",
    appId: "1:435947570341:web:0e7e37998d4fb14ff7794c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const UID = "hudOwfQ1j4c6eM2uQ4O4S4kT0kh2"; // Replace with dynamic UID if needed

export async function getUserBookings() {
    // Fetch MyBookings
    const userDocRef = doc(db, "user details", UID);
    const userDocSnap = await getDoc(userDocRef);
    let myBookings = [];
    if (userDocSnap.exists()) {
        myBookings = userDocSnap.data().MyBookings || [];
    }

    // Fetch bookingHistory
    const bookingHistoryRef = doc(db, "user details", UID, "Bookings", "Book");
    const bookingHistorySnap = await getDoc(bookingHistoryRef);
    let bookingHistory = [];
    if (bookingHistorySnap.exists()) {
        bookingHistory = bookingHistorySnap.data().bookingHistory || [];
    }

    // Combine both arrays
    return [...myBookings, ...bookingHistory];
}
