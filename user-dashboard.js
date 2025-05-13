import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    // ...existing Firebase configuration...
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Logout functionality
document.getElementById('logout').addEventListener('click', () => {
    signOut(auth).then(() => {
        alert('Logged out successfully!');
        window.location.href = "user-login.html";
    }).catch((error) => {
        alert('Error logging out: ' + error.message);
    });
});

// Example: Populate ride options dynamically
const rideList = document.getElementById('ride-list');
const rides = [
    { id: 1, name: "Ride to Downtown", price: "$10" },
    { id: 2, name: "Ride to Airport", price: "$25" },
    { id: 3, name: "Ride to Mall", price: "$15" }
];

rides.forEach(ride => {
    const listItem = document.createElement('li');
    listItem.textContent = `${ride.name} - ${ride.price}`;
    rideList.appendChild(listItem);
});

document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove("active"));
            // Add active class to the clicked button
            button.classList.add("active");

            // Hide all tab contents
            tabContents.forEach(content => content.classList.add("hidden"));

            // Show the corresponding tab content
            const targetTabId = button.dataset.tab;
            const targetTab = document.getElementById(targetTabId);
            if (targetTab) {
                targetTab.classList.remove("hidden");
            }
        });
    });
});
