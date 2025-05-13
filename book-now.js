import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, query, where, orderBy, limit, updateDoc, arrayUnion, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// --- Add these imports for user-login-7b442 project ---
import { initializeApp as initializeUserApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore as getUserFirestore, doc as userDoc, getDoc as getUserDoc, setDoc as setUserDoc, updateDoc as updateUserDoc, arrayUnion as userArrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth as getUserAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyASmbOcKXv_Qnv2RcSAh7_1liSymK7mivE",
  authDomain: "ev-station-53039.firebaseapp.com",
  projectId: "ev-station-53039",
  storageBucket: "ev-station-53039.firebasestorage.app",
  messagingSenderId: "326684639247",
  appId: "1:326684639247:web:214f401926b7a9c275237a"
};

// --- USER FIREBASE CONFIG FOR user-login-7b442 ---
// Use the correct storageBucket for Firestore (should be .appspot.com, not .firebasestorage.app)
const userFirebaseConfig = {
  apiKey: "AIzaSyAtlIYcdeq__YiJCE2QwxjDbYCu9gmfJgk",
  authDomain: "user-login-7b442.firebaseapp.com",
  databaseURL: "https://user-login-7b442-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "user-login-7b442",
  storageBucket: "user-login-7b442.appspot.com", // <-- correct for Firestore
  messagingSenderId: "435947570341",
  appId: "1:435947570341:web:0e7e37998d4fb14ff7794c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Initialize user-login-7b442 app only once ---
let userApp, userDb, userAuth;
if (!window._userLoginApp) {
  userApp = initializeUserApp(userFirebaseConfig, "user-login-app");
  userDb = getUserFirestore(userApp);
  userAuth = getUserAuth(userApp);
  window._userLoginApp = userApp;
  window._userLoginDb = userDb;
  window._userLoginAuth = userAuth;
} else {
  userApp = window._userLoginApp;
  userDb = window._userLoginDb;
  userAuth = window._userLoginAuth;
}

const middleOfIndia = [78.9629, 20.5937]; // Longitude and latitude of India
let userMarker = null;
let geoWatchId = null; // Track the geolocation watch ID
let currentUserCoords = null; // Save current user location

let routeLayerId = "route-line";
let toMarker = null;
let evStationMarkers = []; // Store references to all EV station markers
let evStations = []; // Store all EV stations for searching nearby
let nearbyMarkers = []; // Store references to nearby numbered markers
let lastSearchedCoords = null; // Store last searched destination coords

async function geocodeLocation(name) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) throw new Error(`Location not found: ${name}`);
  // Return [lng, lat] and display name
  return {
    coords: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
    display_name: data[0].display_name
  };
}

async function drawRoute(map, from, to) {
  // Remove previous route and to-marker if exist
  if (map.getSource("route")) {
    map.removeLayer(routeLayerId);
    map.removeSource("route");
  }
  if (toMarker) { toMarker.remove(); toMarker = null; }

  // Only add marker for destination (to)
  toMarker = new maplibregl.Marker({ color: "red" })
    .setLngLat(to.coords)
    .setPopup(new maplibregl.Popup().setText("To: " + to.display_name))
    .addTo(map);

  // Save last searched coords for "search nearby to searched location"
  lastSearchedCoords = to.coords;

  // Fetch route from OSRM API
  const url = `https://router.project-osrm.org/route/v1/driving/${from.coords[0]},${from.coords[1]};${to.coords[0]},${to.coords[1]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch route");
  const data = await res.json();
  if (!data.routes || !data.routes[0]) throw new Error("No route found");

  const routeGeoJSON = {
    type: "Feature",
    geometry: data.routes[0].geometry,
  };

  map.addSource("route", {
    type: "geojson",
    data: routeGeoJSON,
  });

  map.addLayer({
    id: routeLayerId,
    type: "line",
    source: "route",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#00ff99", "line-width": 5 },
  });

  // Fit map to route
  const coords = routeGeoJSON.geometry.coordinates;
  const bounds = coords.reduce(
    (b, coord) => b.extend(coord),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  );
  map.fitBounds(bounds, { padding: 40 });
}

function trackUserLocation(map) {
  if (!navigator.geolocation) {
    console.error("Geolocation not supported.");
    return;
  }

  let firstUpdate = true;
  let markerElement = null;

  // Clear any previous watch
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
  }

  function updateAccuracyDisplay(accuracy) {
    const accuracyDiv = document.getElementById("location-accuracy");
    if (accuracyDiv) {
      accuracyDiv.textContent = `Accuracy: ${Math.round(accuracy)} meters`;
    }
  }

  geoWatchId = navigator.geolocation.watchPosition(
    (position) => {
      const lng = position.coords.longitude;
      const lat = position.coords.latitude;
      const accuracy = position.coords.accuracy;
      const location = [lng, lat];

      updateAccuracyDisplay(accuracy);

      console.log("Live location:", location, "Accuracy:", accuracy, "meters");

      currentUserCoords = [lng, lat]; // Save current user location

      if (!userMarker) {
        markerElement = document.createElement("div");
        markerElement.className = "loader-shape-3";
        userMarker = new maplibregl.Marker({ element: markerElement })
          .setLngLat(location)
          .setPopup(
            new maplibregl.Popup({ offset: 25 }).setHTML(
              `<strong>You are here</strong><br>Accuracy: ${Math.round(accuracy)}m`
            )
          )
          .addTo(map)
          .togglePopup();
        markerElement.addEventListener("click", () => {
          map.flyTo({ center: location, zoom: 15 });
        });
      } else {
        userMarker.setLngLat(location);
        userMarker.setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>You are here</strong><br>Accuracy: ${Math.round(accuracy)}m`
          )
        );
      }

      if (firstUpdate) {
        map.flyTo({ center: location, zoom: 15 });
        firstUpdate = false;
      }
    },
    (err) => {
      updateAccuracyDisplay("Unavailable");
      console.error("Geolocation error:", err.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );
}

// Add manual refresh button logic
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("refresh-location");
  if (btn) {
    btn.addEventListener("click", () => {
      if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
      }
      if (userMarker) {
        userMarker.remove();
        userMarker = null;
      }
      trackUserLocation(window._mapInstance);
    });
  }

  // Attach to the new button by id
  const searchBtn = document.getElementById("search-nearby-btn");
  if (searchBtn) {
    searchBtn.onclick = searchNearby;
  }

  const closeBtn = document.getElementById("close-booking-tab");
  if (closeBtn) {
    closeBtn.onclick = hideBookingTab;
  }

  const overlay = document.getElementById("booking-modal-overlay");
  if (overlay) {
    overlay.onclick = hideBookingTab;
  }

  // Add new button for "Search Nearby to Searched Location"
  let searchNearToBtn = document.getElementById("search-near-to-btn");
  if (!searchNearToBtn) {
    searchNearToBtn = document.createElement("button");
    searchNearToBtn.id = "search-near-to-btn";
    searchNearToBtn.textContent = "Search Nearby to Searched Location";
    searchNearToBtn.style.position = "absolute";
    searchNearToBtn.style.left = "20px";
    searchNearToBtn.style.top = "70%";
    searchNearToBtn.style.transform = "translateY(-50%)";
    searchNearToBtn.style.zIndex = "1000";
    document.body.appendChild(searchNearToBtn);
  }
  searchNearToBtn.onclick = () => {
    if (!lastSearchedCoords) {
      alert("Please search a destination first using Get Directions.");
      return;
    }
    searchNearbyToCoords(lastSearchedCoords);
  };
});

function calculateDistance(coord1, coord2) {
  // Haversine formula
  const R = 6371; // km
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(coord2[1] - coord1[1]);
  const dLng = toRad(coord2[0] - coord1[0]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1[1])) *
      Math.cos(toRad(coord2[1])) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clearNearbyMarkers() {
  nearbyMarkers.forEach(marker => marker.remove());
  nearbyMarkers = [];
}

// Add this function to search nearby EV stations to a given coords
async function searchNearbyToCoords(coords) {
  clearNearbyMarkers();
  if (!coords) {
    alert("Location not available.");
    return;
  }
  if (!evStations.length) {
    alert("No EV stations loaded.");
    return;
  }
  const stationsWithDistance = evStations
    .map(station => ({
      ...station,
      distance: calculateDistance(coords, station.coords),
    }))
    .filter(station => station.distance <= 100)
    .sort((a, b) => a.distance - b.distance);

  if (!stationsWithDistance.length) {
    alert("No nearby EV stations found within 100 km.");
    return;
  }

  stationsWithDistance.forEach((station, idx) => {
    const markerElement = document.createElement("div");
    markerElement.style.backgroundColor = "#0074D9";
    markerElement.style.color = "#fff";
    markerElement.style.width = "30px";
    markerElement.style.height = "30px";
    markerElement.style.borderRadius = "50%";
    markerElement.style.display = "flex";
    markerElement.style.justifyContent = "center";
    markerElement.style.alignItems = "center";
    markerElement.style.fontSize = "16px";
    markerElement.style.fontWeight = "bold";
    markerElement.textContent = idx + 1;

    const marker = new maplibregl.Marker({ element: markerElement })
      .setLngLat(station.coords)
      .addTo(window._mapInstance);

    marker.getElement().addEventListener("click", async (e) => {
      e.stopPropagation();
      await showBookingTab(station);
    });

    nearbyMarkers.push(marker);
  });

  alert(
    `Found ${stationsWithDistance.length} nearby station(s):\n` +
      stationsWithDistance
        .map(
          (station, idx) =>
            `${idx + 1}. ${station.name || "EV Station"} (${station.distance.toFixed(2)} km)`
        )
        .join("\n")
  );
}

// Fetch user info (Name, mail) from user-login-7b442 Firestore
async function getCurrentUserInfo() {
  // Try user-login-7b442 auth first, fallback to main project auth
  let user = userAuth.currentUser;
  if (!user) {
    // Try to get from main project auth
    user = getAuth().currentUser;
  }
  // If still not available, wait for onAuthStateChanged (for both auths)
  if (!user) {
    user = await new Promise((resolve) => {
      let resolved = false;
      onAuthStateChanged(userAuth, (u) => {
        if (u && !resolved) { resolved = true; resolve(u); }
      });
      onAuthStateChanged(getAuth(), (u) => {
        if (u && !resolved) { resolved = true; resolve(u); }
      });
      setTimeout(() => { if (!resolved) resolve(null); }, 2000);
    });
  }
  if (!user) {
    // Could not get user from either auth
    return {
      name: "AK",
      mail: "karthiak377@gmail.com",
      uid: null
    };
  }
  // Try to fetch user details from user-login-7b442 Firestore using the UID
  try {
    const uid = user.uid;
    const userRef = userDoc(userDb, "user details", uid);
    const docSnap = await getUserDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        name: data.Name || "AK",
        mail: data.mail || "karthiak377@gmail.com",
        uid: uid
      };
    } else {
      // User doc not found, but user is logged in
      return {
        name: "AK",
        mail: "karthiak377@gmail.com",
        uid: uid
      };
    }
  } catch (error) {
    // Fallback if Firestore fails
    return {
      name: "AK",
      mail: "karthiak377@gmail.com",
      uid: user.uid || null
    };
  }
}

async function fetchLiveSlotsForStation(station) {
  let stationDocId = null;
  let slotsMap = {};
  let collectionName = "evstations";
  // Try "evstations" collection
  let docSnap = null;
  let evStationsCol = collection(db, "evstations");
  let q1 = query(evStationsCol, where("location", "==", station.name));
  let snap1 = await getDocs(q1);
  if (!snap1.empty) {
    docSnap = snap1.docs[0];
    stationDocId = docSnap.id;
    collectionName = "evstations";
  } else {
    // Try "stations" collection
    let stationsCol = collection(db, "stations");
    let q2 = query(stationsCol, where("Name", "==", station.name));
    let snap2 = await getDocs(q2);
    if (!snap2.empty) {
      docSnap = snap2.docs[0];
      stationDocId = snap2.docs[0].id;
      collectionName = "stations";
    }
  }
  if (!docSnap) {
    // fallback to dummy
    return getSlotsForStation(station);
  }
  const data = docSnap.data();
  if (data.slots && typeof data.slots === "object") {
    slotsMap = data.slots;
  }
  // Convert slotsMap to array (show slot names like "Slot 1", "Slot 2", etc.)
  const slots = Object.entries(slotsMap).map(([slotId, slotObj], idx) => {
    let available = slotObj.status === "available";
    let nextAvailable = null;
    if (!available && slotObj.chargingTime) {
      // Only use chargingTime if it's a valid number
      const chargingTimeNum = Number(slotObj.chargingTime);
      if (!isNaN(chargingTimeNum) && isFinite(chargingTimeNum)) {
        nextAvailable = new Date(chargingTimeNum).toISOString();
        if (Date.now() > chargingTimeNum) {
          available = true;
          nextAvailable = null;
        }
      } else {
        nextAvailable = null;
      }
    }
    // Use slotId if it's already a readable name, otherwise format as "Slot X"
    let displayName = slotId.toLowerCase().startsWith("slot") ? slotId : `Slot ${idx + 1}`;
    return {
      id: slotId,
      name: displayName,
      available,
      nextAvailable,
      details: slotObj.status === "available" ? "" : "Booked",
      raw: slotObj
    };
  });
  // If no slots, fallback to dummy
  if (!slots.length) return getSlotsForStation(station);
  // Attach Firestore info for booking
  slots._stationDocId = stationDocId;
  slots._collectionName = collectionName;
  return slots;
}

// Show booking tab and fetch live slot data
async function showBookingTab(station) {
  const tab = document.getElementById("booking-tab");
  const overlay = document.getElementById("booking-modal-overlay");
  const nameElem = document.getElementById("booking-station-name");
  const detailsElem = document.getElementById("booking-station-details");
  const notifElem = document.getElementById("booking-station-notification");
  if (!tab || !nameElem || !detailsElem || !overlay || !notifElem) return;

  nameElem.textContent = station.name || "EV Station";

  // Fetch Notifications from Firestore (stations collection)
  notifElem.textContent = "";
  let notificationText = "";
  try {
    let stationDocId = null;
    let collectionName = "evstations";
    // Try to find station doc id and collection
    let docSnap = null;
    let evStationsCol = collection(db, "evstations");
    let q1 = query(evStationsCol, where("location", "==", station.name));
    let snap1 = await getDocs(q1);
    if (!snap1.empty) {
      docSnap = snap1.docs[0];
      stationDocId = docSnap.id;
      collectionName = "evstations";
    } else {
      let stationsCol = collection(db, "stations");
      let q2 = query(stationsCol, where("Name", "==", station.name));
      let snap2 = await getDocs(q2);
      if (!snap2.empty) {
        docSnap = snap2.docs[0];
        stationDocId = snap2.docs[0].id;
        collectionName = "stations";
      }
    }
    if (docSnap) {
      const data = docSnap.data();
      notificationText = data.Notifications || "";
    }
  } catch (e) {
    notificationText = "";
  }
  notifElem.textContent = notificationText ? `Notification: ${notificationText}` : "";

  // Remove type and distance from details
  detailsElem.innerHTML = `
    <strong>Status:</strong> ${station.status || "Unknown"}
    ${station.extraDetails ? `<br>${station.extraDetails}` : ""}
  `;

  // Always hide booking time section until slot is clicked
  const bookingTimingSection = document.getElementById("booking-timing-section");
  if (bookingTimingSection) bookingTimingSection.style.display = "none";
  const slotInfo = document.getElementById("slot-info");
  if (slotInfo) slotInfo.innerHTML = "";

  const slots = await fetchLiveSlotsForStation(station);
  renderSlots(station, slots);

  tab.style.display = "block";
  overlay.style.display = "block";
}

// Render slots and handle slot selection
function renderSlots(station, slots) {
  const slotsContainer = document.getElementById("slots-container");
  const slotInfo = document.getElementById("slot-info");
  const bookingTimingSection = document.getElementById("booking-timing-section");
  if (!slotsContainer || !slotInfo || !bookingTimingSection) return;

  slotsContainer.innerHTML = "";
  slotInfo.innerHTML = "";
  bookingTimingSection.style.display = "none";

  // All slots are always enabled for booking (no per-slot available/booked logic)
  slots.forEach(slot => {
    const btn = document.createElement("button");
    btn.textContent = slot.name;
    btn.style.padding = "8px 12px";
    btn.style.borderRadius = "6px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.background = "#27ae60";
    btn.style.color = "#fff";
    btn.disabled = false;
    btn.onclick = () => handleSlotClick(slot, station, slots);
    slotsContainer.appendChild(btn);
  });

  station._liveSlots = slots;
}

// Handle slot click and booking
function handleSlotClick(slot, station, slotsArr) {
  const slotInfo = document.getElementById("slot-info");
  const bookingTimingSection = document.getElementById("booking-timing-section");
  const bookingTimeFromInput = document.getElementById("booking-time-from");
  const bookingTimeToInput = document.getElementById("booking-time-to");
  const confirmBtn = document.getElementById("confirm-booking-btn");
  if (!slotInfo || !bookingTimingSection || !bookingTimeFromInput || !bookingTimeToInput || !confirmBtn) return;

  // Fetch currentStatus from Firestore for this slot
  (async () => {
    let currentStatus = "";
    try {
      let stationDocId = slotsArr && slotsArr._stationDocId;
      let collectionName = slotsArr && slotsArr._collectionName;
      if (stationDocId && collectionName) {
        const stationDocRef = doc(db, collectionName, stationDocId);
        const stationSnap = await getDoc(stationDocRef);
        if (stationSnap.exists()) {
          const data = stationSnap.data();
          if (data.slots && data.slots[slot.id] && data.slots[slot.id].currentStatus) {
            currentStatus = data.slots[slot.id].currentStatus;
          }
        }
      }
    } catch (e) {
      currentStatus = "";
    }
    slotInfo.innerHTML = `<strong>${slot.name}</strong><br><span style="color:#ffd700;">Current Status: ${currentStatus || "Unknown"}</span>`;
  })();

  bookingTimingSection.style.display = "block";
  bookingTimeFromInput.value = "";
  bookingTimeToInput.value = "";
  confirmBtn.onclick = async () => {
    if (!bookingTimeFromInput.value || !bookingTimeToInput.value) {
      alert("Please select both From and To booking times.");
      return;
    }
    await storeBookingInFirestore(
      station,
      slot,
      {
        from: bookingTimeFromInput.value,
        to: bookingTimeToInput.value
      },
      slotsArr
    );
    alert(`Booked ${slot.name} from ${bookingTimeFromInput.value} to ${bookingTimeToInput.value} for ${station.name || "EV Station"}`);
    hideBookingTab();
  };
}

// Helper: Check if two time intervals overlap
function isTimeOverlap(start1, end1, start2, end2) {
  return (start1 < end2) && (start2 < end1);
}

// Store booking info in Firestore (station -> Bookings -> Book under slot)
// Also store the same booking in the user's Firestore at user details/{uid}/Bookings/Book/bookingHistory
async function storeBookingInFirestore(station, slot, bookingTime, slotsArr) {
  // Get user info from user-login-7b442
  const userInfo = await getCurrentUserInfo();

  // Find station doc id and collection
  let stationDocId = slotsArr && slotsArr._stationDocId;
  let collectionName = slotsArr && slotsArr._collectionName;
  if (!stationDocId || !collectionName) {
    const evStationsCol = collection(db, "evstations");
    const q = query(evStationsCol, where("location", "==", station.name));
    const snap = await getDocs(q);
    if (!snap.empty) {
      stationDocId = snap.docs[0].id;
      collectionName = "evstations";
    } else {
      const stationsCol = collection(db, "stations");
      const q2 = query(stationsCol, where("Name", "==", station.name));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        stationDocId = snap2.docs[0].id;
        collectionName = "stations";
      }
    }
  }
  if (!stationDocId) {
    alert("Could not find station in Firestore for booking.");
    return;
  }

  // Fetch existing bookings for this slotNo
  const bookDocRef = doc(db, collectionName, stationDocId, "Bookings", "Book");
  const bookDocSnap = await getDoc(bookDocRef);
  let bookingHistory = [];
  if (bookDocSnap.exists()) {
    bookingHistory = bookDocSnap.data().bookingHistory || [];
  }

  // Parse requested booking times
  const reqFrom = new Date(bookingTime.from).getTime();
  const reqTo = new Date(bookingTime.to).getTime();

  // Check for overlap with existing bookings for this slot
  const conflicting = bookingHistory.find(b =>
    b.slotNo == slot.id &&
    b.chargingfrom && b.chargingto &&
    isTimeOverlap(
      reqFrom, reqTo,
      new Date(b.chargingfrom).getTime(),
      new Date(b.chargingto).getTime()
    )
  );

  if (conflicting) {
    alert(
      `Slot already booked!\nFrom: ${conflicting.chargingfrom}\nTo: ${conflicting.chargingto}`
    );
    return;
  }

  // Booking object to save
  const bookingObj = {
    Name: userInfo.name,
    Mail: userInfo.mail,
    chargingfrom: bookingTime.from,
    chargingto: bookingTime.to,
    slotNo: slot.id,
    station: station.name || "EV Station"
  };

  // Add booking object to Bookings/Book/bookingHistory array (station side)
  await updateDoc(bookDocRef, {
    bookingHistory: arrayUnion(bookingObj)
  });

  // --- Ensure user booking is stored in user-login-7b442 db ---
  if (userInfo.uid && userDb) {
    try {
      const userBookDocRef = userDoc(userDb, "user details", userInfo.uid, "Bookings", "Book");
      // Always fetch the latest bookingHistory, append, and set (arrayUnion can silently fail across projects)
      let userBookDocSnap = await getUserDoc(userBookDocRef);
      let userBookingHistory = [];
      if (userBookDocSnap.exists()) {
        userBookingHistory = Array.isArray(userBookDocSnap.data().bookingHistory)
          ? [...userBookDocSnap.data().bookingHistory]
          : [];
      }
      userBookingHistory.push(bookingObj);
      await setUserDoc(userBookDocRef, { bookingHistory: userBookingHistory }, { merge: true });
    } catch (err) {
      // If doc doesn't exist, create it with the booking
      try {
        const userBookDocRef = userDoc(userDb, "user details", userInfo.uid, "Bookings", "Book");
        await setUserDoc(userBookDocRef, { bookingHistory: [bookingObj] });
      } catch (err2) {
        alert("Failed to save booking in user Firestore (user-login-7b442): " + err2.message);
        console.error("Failed to save booking in user Firestore (user-login-7b442):", err2);
      }
    }
  }

  // Optionally update slot status and chargingfrom/chargingto in the station doc
  const stationDocRef = doc(db, collectionName, stationDocId);
  const slotField = `slots.${slot.id}`;
  await updateSlotStatus(stationDocRef, slotField, bookingTime.from, bookingTime.to);
}

// Helper to update slot status in Firestore
async function updateSlotStatus(stationDocRef, slotField, chargingFrom, chargingTo) {
  const stationSnap = await getDoc(stationDocRef);
  if (!stationSnap.exists()) return;
  const data = stationSnap.data();
  let slots = data.slots;

  if (Array.isArray(slots)) {
    const slotsMap = {};
    slots.forEach((slot, idx) => {
      const key = slot && slot.id ? slot.id : `slot${idx + 1}`;
      slotsMap[key] = { ...slot };
    });
    const slotId = slotField.split(".")[1];
    if (slotsMap[slotId]) {
      slotsMap[slotId].status = "booked";
      slotsMap[slotId].chargingfrom = chargingFrom;
      slotsMap[slotId].chargingto = chargingTo;
    }
    await updateDoc(stationDocRef, { slots: slotsMap });
  } else {
    await updateDoc(stationDocRef, {
      [`${slotField}.status`]: "booked",
      [`${slotField}.chargingfrom`]: chargingFrom,
      [`${slotField}.chargingto`]: chargingTo
    });
  }
}

async function searchNearby() {
  clearNearbyMarkers();
  if (!currentUserCoords) {
    alert("User location not available. Please enable location tracking.");
    return;
  }
  if (!evStations.length) {
    alert("No EV stations loaded.");
    return;
  }
  const userLocation = currentUserCoords;
  const stationsWithDistance = evStations
    .map(station => ({
      ...station,
      distance: calculateDistance(userLocation, station.coords),
    }))
    .filter(station => station.distance <= 100)
    .sort((a, b) => a.distance - b.distance);

  if (!stationsWithDistance.length) {
    alert("No nearby EV stations found within 100 km.");
    return;
  }

  stationsWithDistance.forEach((station, idx) => {
    const markerElement = document.createElement("div");
    markerElement.style.backgroundColor = "#0074D9";
    markerElement.style.color = "#fff";
    markerElement.style.width = "30px";
    markerElement.style.height = "30px";
    markerElement.style.borderRadius = "50%";
    markerElement.style.display = "flex";
    markerElement.style.justifyContent = "center";
    markerElement.style.alignItems = "center";
    markerElement.style.fontSize = "16px";
    markerElement.style.fontWeight = "bold";
    markerElement.textContent = idx + 1;

  const marker = new maplibregl.Marker({ element: markerElement })
    .setLngLat(station.coords)
    .addTo(window._mapInstance);
  markerElement.style.height = "30px";
  markerElement.style.borderRadius = "50%";
  markerElement.style.display = "flex";
  markerElement.style.justifyContent = "center";
  markerElement.style.alignItems = "center";
  markerElement.style.fontSize = "16px";
  markerElement.style.fontWeight = "bold";
  markerElement.textContent = idx + 1;

    // Always show booking tab on marker click (use marker.getElement())
    marker.getElement().addEventListener("click", async (e) => {
      e.stopPropagation();
      await showBookingTab(station);
    });

    nearbyMarkers.push(marker);
  });

  alert(
    `Found ${stationsWithDistance.length} nearby station(s):\n` +
      stationsWithDistance
        .map(
          (station, idx) =>
            `${idx + 1}. ${station.name || "EV Station"} (${station.distance.toFixed(2)} km)`
        )
        .join("\n")
  );
}

function hideBookingTab() {
  const tab = document.getElementById("booking-tab");
  const overlay = document.getElementById("booking-modal-overlay");
  if (tab) tab.style.display = "none";
  if (overlay) overlay.style.display = "none";
}

async function addEVStationMarkers(map) {
  if (map._evMarkersAdded) return;
  map._evMarkersAdded = true;

  const evStationsCol = collection(db, "evstations");
  const evStationsSnap = await getDocs(evStationsCol);
  evStationsSnap.forEach((doc) => {
    const data = doc.data();
    if (!data.locations || typeof data.locations.longitude !== "number" || typeof data.locations.latitude !== "number") return;
    const markerElement = document.createElement("div");
    markerElement.style.backgroundColor = "#2ecc40";
    markerElement.style.width = "28px";
    markerElement.style.height = "28px";
    markerElement.style.borderRadius = "50%";
    markerElement.style.display = "flex";
    markerElement.style.justifyContent = "center";
    markerElement.style.alignItems = "center";
    markerElement.style.color = "#fff";
    markerElement.style.fontWeight = "bold";
    markerElement.textContent = "⚡";
    const popupHtml = `
      <strong>${data.location || "EV Station"}</strong><br>
      Latitude: ${data.locations.latitude}<br>
      Longitude: ${data.locations.longitude}
    `;
    const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupHtml);
    let marker = new maplibregl.Marker({ element: markerElement })
      .setLngLat([data.locations.longitude, data.locations.latitude])
      .setPopup(popup)
      .addTo(map);
    evStationMarkers.push(marker);

    evStations.push({
      coords: [data.locations.longitude, data.locations.latitude],
      name: data.location || "EV Station",
      type: data.type || "N/A"
    });
  });

  const stationsCol = collection(db, "stations");
  const stationsSnap = await getDocs(stationsCol);
  stationsSnap.forEach((doc) => {
    const data = doc.data();
    const lat = data.latitude;
    const lng = data.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      const popupContent = `
       <strong>Name:</strong> ${data["Name"]}<br>
        <strong>Total Slots:</strong> ${data["Total Slots"]}<br>
        <strong>Notification:</strong> ${data.Notifications}<br>
        <strong>Status:</strong> ${data.status ? data.status : "Unknown"}
      `;
      let marker = new maplibregl.Marker({ color: "green" })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup().setHTML(popupContent))
        .addTo(map);

      // Always show booking tab on marker click (use marker.getElement())
      marker.getElement().addEventListener("click", async (e) => {
        e.stopPropagation();
        await showBookingTab({
          coords: [lng, lat],
          name: data["Name"] || "EV Station",
          type: "N/A",
          status: data.status || "Unknown"
        });
      });

      evStationMarkers.push(marker);

      evStations.push({
        coords: [lng, lat],
        name: data["Name"] || "EV Station",
        type: "N/A",
        status: data.status || "Unknown"
      });
    }
  });
}

function removeEVStationMarkers() {
  evStationMarkers.forEach(marker => marker.remove());
  evStationMarkers = [];
  if (window._mapInstance) window._mapInstance._evMarkersAdded = false;
}

async function init() {
  console.log("Initializing map...");
  const map = new maplibregl.Map({
    style: "./dark.json",
    center: middleOfIndia,
    zoom: 4,
    container: "map",
  });

  window._mapInstance = map;

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  map.on("load", async () => {
    console.log("Map loaded successfully.");

    trackUserLocation(map);

    document.getElementById("route-btn").onclick = async () => {
      const toStr = document.getElementById("to-coords").value.trim();
      const errorDiv = document.getElementById("route-error");
      errorDiv.textContent = "";

      try {
        if (!toStr) throw new Error("Please enter a destination.");
        if (!currentUserCoords) throw new Error("Current location not available yet.");
        errorDiv.textContent = "Searching destination...";
        const from = { coords: currentUserCoords, display_name: "Your Location" };
        const to = await geocodeLocation(toStr);
        errorDiv.innerHTML = `From: Your Location<br>To: ${to.display_name}<br>Fetching route...`;
        await drawRoute(map, from, to);
        errorDiv.textContent = "";
      } catch (err) {
        errorDiv.textContent = err.message;
      }
    };

    const switchInput = document.getElementById("station-switch");
    switchInput.checked = false;

    switchInput.addEventListener("change", async function () {
      if (this.checked) {
        await addEVStationMarkers(map);
      } else {
        removeEVStationMarkers();
      }
    });
  });

  map.on("error", (e) => {
    console.error("Map error:", e);
  });
}

init();

// To show the user's bookings on the dashboard, fetch from:
// user details/<user UID>/MyBookings (array field)
//
// Example function to fetch all bookings for the current user:
export async function getUserBookings() {
  return new Promise((resolve) => {
    onAuthStateChanged(userAuth, async (user) => {
      if (user && user.uid) {
        const userDocRef = userDoc(userDb, "user details", user.uid);
        const userDocSnap = await getUserDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          resolve(Array.isArray(data.MyBookings) ? data.MyBookings : []);
        } else {
          resolve([]);
        }
      } else {
        resolve([]);
      }
    });
  });
}

// Usage (in your dashboard page):
// import { getUserBookings } from './book-now.js';
// const bookings = await getUserBookings();
// // Render bookings in your dashboard