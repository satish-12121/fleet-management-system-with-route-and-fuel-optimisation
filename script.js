const state = {
  stops: [],
  markers: [],
  routeLine: null,
  map: null,
  charts: {}
};

const cityCoordinates = {
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Coimbatore: [11.0168, 76.9558],
  Madurai: [9.9252, 78.1198],
  Hyderabad: [17.3850, 78.4867],
  Hubballi: [15.3173, 75.7139],
  Mysuru: [12.2958, 76.6394]
};

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupCharts();
  setupMap();
  setupRouteControls();

  document.getElementById("signOutBtn").addEventListener("click", () => {
    alert("Demo action: Sign out clicked.");
  });
});

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;

      navItems.forEach((nav) => nav.classList.toggle("active", nav === item));
      document.querySelectorAll(".page").forEach((section) => {
        section.classList.remove("active-page");
      });

      document.getElementById(`${page}Page`).classList.add("active-page");

      if (page === "route" && state.map) {
        setTimeout(() => state.map.invalidateSize(), 100);
      }
    });
  });
}

function setupCharts() {
  const labels = Array.from({ length: 30 }, (_, i) => `08/${String(i + 1).padStart(2, "0")}`);
  const fuelData = [540, 480, 470, 620, 530, 490, 550, 510, 420, 500, 560, 505, 520, 480, 470, 565, 500, 560, 510, 520, 560, 510, 540, 500, 530, 370, 480, 370, 410, 425];
  const distanceData = [240, 220, 210, 270, 230, 220, 245, 230, 190, 215, 245, 220, 235, 210, 220, 250, 215, 265, 220, 230, 245, 230, 240, 235, 240, 175, 230, 170, 190, 190];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0e152b",
        borderColor: "rgba(130,145,220,.3)",
        borderWidth: 1,
        titleColor: "#fff",
        bodyColor: "#c5ccea"
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(140,155,220,.08)" },
        ticks: { color: "#7e8aad", maxTicksLimit: 10, font: { size: 10 } }
      },
      y: {
        grid: { color: "rgba(140,155,220,.10)" },
        ticks: { color: "#7e8aad", font: { size: 10 } },
        beginAtZero: true
      }
    }
  };

  state.charts.trend = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Fuel (L)",
          data: fuelData,
          borderColor: "#6d5fff",
          backgroundColor: "rgba(109,95,255,.12)",
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: "#6d5fff",
          tension: .35,
          fill: false
        },
        {
          label: "Distance (km ÷ 10)",
          data: distanceData,
          borderColor: "#1bd2b4",
          backgroundColor: "rgba(27,210,180,.10)",
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: "#1bd2b4",
          tension: .35,
          fill: false
        }
      ]
    },
    options: chartOptions
  });

  state.charts.fuel = new Chart(document.getElementById("fuelChart"), {
    type: "doughnut",
    data: {
      labels: ["Diesel", "Petrol"],
      datasets: [{
        data: [85, 15],
        backgroundColor: ["#6257df", "#f4aa22"],
        borderWidth: 0,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      cutout: "64%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0e152b",
          borderColor: "rgba(130,145,220,.3)",
          borderWidth: 1
        }
      }
    }
  });
}

function setupMap() {
  state.map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView([12.4, 77.2], 6);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(state.map);

  state.map.on("click", (event) => {
    addStop(event.latlng.lat, event.latlng.lng, `Map stop ${state.stops.length + 1}`);
  });
}

function setupRouteControls() {
  document.getElementById("citySelect").addEventListener("change", (event) => {
    const value = event.target.value;
    if (!value) return;

    const [lat, lng, name] = value.split(",");
    addStop(Number(lat), Number(lng), name);
    event.target.value = "";
  });

  document.getElementById("clearBtn").addEventListener("click", clearRoute);
  document.getElementById("optimizeBtn").addEventListener("click", optimizeRoute);
}

function addStop(lat, lng, name) {
  const stop = {
    id: Date.now() + Math.random(),
    lat,
    lng,
    name
  };

  state.stops.push(stop);
  renderStops();
  drawRoute(false);

  const marker = L.marker([lat, lng]).addTo(state.map).bindPopup(`<strong>${escapeHtml(name)}</strong>`);
  state.markers.push(marker);
  marker.openPopup();
}

function renderStops() {
  const list = document.getElementById("stopsList");
  document.getElementById("stopCount").textContent = state.stops.length;

  if (!state.stops.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-pin">📍</div>
        <p>Add at least 3 stops to optimize</p>
      </div>
    `;
    return;
  }

  list.innerHTML = state.stops.map((stop, index) => `
    <div class="stop-row">
      <div class="stop-index">${index + 1}</div>
      <div class="stop-info">
        <strong>${escapeHtml(stop.name)}</strong>
        <span>${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</span>
      </div>
      <button class="remove-stop" data-id="${stop.id}" aria-label="Remove ${escapeHtml(stop.name)}">✕</button>
    </div>
  `).join("");

  list.querySelectorAll(".remove-stop").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      removeStop(id);
    });
  });
}

function removeStop(id) {
  const index = state.stops.findIndex((stop) => stop.id === id);
  if (index === -1) return;

  state.stops.splice(index, 1);
  if (state.markers[index]) {
    state.map.removeLayer(state.markers[index]);
    state.markers.splice(index, 1);
  }

  renderStops();
  drawRoute(false);
  hideSummary();
}

function clearRoute() {
  state.stops = [];
  state.markers.forEach((marker) => state.map.removeLayer(marker));
  state.markers = [];

  if (state.routeLine) {
    state.map.removeLayer(state.routeLine);
    state.routeLine = null;
  }

  renderStops();
  hideSummary();
}

function drawRoute(includeReturn) {
  if (state.routeLine) {
    state.map.removeLayer(state.routeLine);
    state.routeLine = null;
  }

  if (state.stops.length < 2) return;

  const points = state.stops.map((stop) => [stop.lat, stop.lng]);
  if (includeReturn && points.length > 1) points.push(points[0]);

  state.routeLine = L.polyline(points, {
    color: "#4287ff",
    weight: 4,
    opacity: .9,
    dashArray: "8 6",
    lineJoin: "round"
  }).addTo(state.map);
}

function optimizeRoute() {
  if (state.stops.length < 3) {
    alert("Please add at least 3 stops before optimizing the route.");
    return;
  }

  const roundTrip = document.getElementById("roundTrip").checked;
  const efficiency = Math.min(98, 58 + state.stops.length * 4);
  const distance = calculateRouteDistance(state.stops, roundTrip);
  const mileage = Number(document.getElementById("vehicleSelect").value);
  const fuel = distance / mileage;
  const estimatedCost = fuel * 92;

  drawRoute(roundTrip);

  const routeSummary = document.getElementById("routeSummary");
  routeSummary.classList.remove("hidden");
  routeSummary.innerHTML = `
    <strong>Optimization complete</strong><br>
    Distance: ${distance.toFixed(1)} km<br>
    Estimated fuel: ${fuel.toFixed(1)} L<br>
    Estimated fuel cost: ₹${Math.round(estimatedCost).toLocaleString("en-IN")}<br>
    Efficiency score: ${efficiency}%
  `;
}

function calculateRouteDistance(stops, roundTrip) {
  let total = 0;

  for (let i = 1; i < stops.length; i++) {
    total += haversineDistance(stops[i - 1], stops[i]);
  }

  if (roundTrip && stops.length > 1) {
    total += haversineDistance(stops[stops.length - 1], stops[0]);
  }

  return total;
}

function haversineDistance(a, b) {
  const earthRadius = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const deltaLat = (b.lat - a.lat) * Math.PI / 180;
  const deltaLng = (b.lng - a.lng) * Math.PI / 180;

  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function hideSummary() {
  const summary = document.getElementById("routeSummary");
  summary.classList.add("hidden");
  summary.innerHTML = "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
