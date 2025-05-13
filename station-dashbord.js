import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  deleteField
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyASmbOcKXv_Qnv2RcSAh7_1liSymK7mivE",
  authDomain: "ev-station-53039.firebaseapp.com",
  projectId: "ev-station-53039",
  storageBucket: "ev-station-53039.appspot.com",
  messagingSenderId: "326684639247",
  appId: "1:326684639247:web:214f401926b7a9c275237a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let stationData = {};
let currentSlotKey = null;

// Fetch data after user is authenticated
onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    // Real-time listener for this user's station document
    onSnapshot(doc(db, "stations", uid), (docSnap) => {
      if (docSnap.exists()) {
        stationData = docSnap.data();
        updateDashboardUI();
      } else {
        console.error("No such document!");
      }
    });

    // Update functions that use uid
    window.saveSlotProperties = async function saveSlotProperties() {
      if (!currentSlotKey) {
        alert("No slot selected!");
        return;
      }

      const newStatus = document.getElementById('slot-status').value;
      const timestampStr = document.getElementById('slot-timestamp').value;

      // Prepare dynamic update path for Firestore
      const updateObj = {};
      updateObj[`slots.${currentSlotKey}.currentStatus`] = newStatus;

      if (newStatus === "booked" && timestampStr) {
        const { Timestamp } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js");
        const chargeUntil = new Date(timestampStr);
        updateObj[`slots.${currentSlotKey}.chargingTime`] = Timestamp.fromDate(chargeUntil);
      } else {
        updateObj[`slots.${currentSlotKey}.chargingTime`] = deleteField();
      }

      try {
        await updateDoc(doc(db, "stations", auth.currentUser.uid), updateObj);
        alert("Slot status updated successfully!");
      } catch (err) {
        alert("Failed to update slot status. Please try again.");
        console.error(err);
      }
    };

    window.updateNotification = async function updateNotification() {
      const notifInput = document.getElementById('notifInput');
      const notifText = notifInput.value.trim();

      if (!notifText) {
        alert("Please enter a notification message.");
        return;
      }

      try {
        await updateDoc(doc(db, "stations", uid), {
          Notifications: notifText,
          notifications: deleteField() // remove old notifications array if exists
        });

        notifInput.value = "";
        document.getElementById("liveNotif").innerText = "🔔 " + notifText;
      } catch (err) {
        console.error("Error updating notification:", err);
        alert("Failed to update. Check console for error.");
      }
    };
  } else {
    // User not logged in
    alert("Please log in to view your station dashboard.");
  }
});

function updateDashboardUI() {
  document.getElementById("totalSlots").innerText = stationData["Total Slots"];
  document.getElementById("availableSlots").innerText = stationData["Available Slots"];
  document.getElementById("revenueToday").innerText = stationData["Today's Revenue"];

  // Render slot buttons dynamically
  const slotsGrid = document.getElementById("slotsGrid");
  slotsGrid.innerHTML = "";
  if (stationData.slots && typeof stationData.slots === "object") {
    Object.keys(stationData.slots).forEach((slotKey, idx) => {
      const slot = stationData.slots[slotKey];
      const slotDiv = document.createElement("button");
      slotDiv.className = `slot ${slot.currentStatus || ""}`;
      slotDiv.textContent = `Slot ${idx + 1}`;
      slotDiv.onclick = () => openSlotProperties(slotKey, idx + 1);
      slotsGrid.appendChild(slotDiv);
    });
  }

  const liveNotif = document.getElementById("liveNotif");
  if (stationData["Notifications"]) {
    liveNotif.innerText = "🔔 " + stationData["Notifications"];
  } else {
    liveNotif.innerText = "No notifications yet.";
  }
}

// Slot property functions
function openSlotProperties(slotKey, slotNumber) {
  currentSlotKey = slotKey;
  const slot = stationData.slots[slotKey];
  document.getElementById('slot-properties').style.display = 'block';
  document.getElementById('selected-slot').innerText = `Editing Slot ${slotNumber}`;
  const statusSelect = document.getElementById('slot-status');
  statusSelect.value = slot.currentStatus || "available";
  // Handle Firestore Timestamp for chargingTime
  if (slot.chargingTime && typeof slot.chargingTime.toDate === "function") {
    const dt = slot.chargingTime.toDate();
    document.getElementById('slot-timestamp').value = dt.toISOString().slice(0,16);
  } else {
    document.getElementById('slot-timestamp').value = "";
  }
  toggleTimeInput();
}

function toggleTimeInput() {
  const statusSelect = document.getElementById('slot-status');
  const timeGroup = document.getElementById('time-input-group');
  if (statusSelect.value === 'booked') {
    timeGroup.style.display = 'block';
  } else {
    timeGroup.style.display = 'none';
    document.getElementById('slot-timestamp').value = '';
  }
}

// Global handlers
window.openSlotProperties = openSlotProperties;
window.toggleTimeInput = toggleTimeInput;

// Chart.js - Weekly Revenue Chart
const ctx = document.getElementById('revenueChart').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Revenue (₹)',
      data: [200, 150, 300, 250, 400, 350, 500],
      backgroundColor: '#38bdf8',
    }]
  },
  options: {
    responsive: true,
    scales: { y: { beginAtZero: true } }
  }
});
