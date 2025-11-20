// --- FUNGSI UNTUK DASHBOARD ---

// Fungsi untuk mengubah milidetik menjadi format yang mudah dibaca
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const d = days;
  const h = hours % 24;
  const m = minutes % 60;

  return `${d} Hari, ${h} Jam, ${m} Menit`;
}

// Fungsi untuk mengambil data dari API dan memperbarui tampilan
async function updateStats() {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const stats = await response.json();

    // Memperbarui elemen HTML dengan data baru
    document.getElementById("uptime").innerText = formatUptime(stats.uptime);
    document.getElementById("server-count").innerText =
      stats.serverCount.toLocaleString("id-ID");
    document.getElementById("user-count").innerText =
      stats.userCount.toLocaleString("id-ID");
  } catch (error) {
    console.error("Gagal mengambil statistik:", error);
    document.getElementById("uptime").innerText = "Gagal memuat";
    document.getElementById("server-count").innerText = "Gagal memuat";
    document.getElementById("user-count").innerText = "Gagal memuat";
  }
}

// --- FUNGSI UNTUK NAVIGASI SPA ---

// Elemen-elemen yang dibutuhkan
const pageNavigation = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");
const sidebar = document.querySelector("[data-sidebar]");

// Fungsi untuk menambahkan event listener navigasi
const addEventOnElements = function (elements, eventType, callback) {
  for (const element of elements) {
    element.addEventListener(eventType, callback);
  }
};

// Fungsi untuk ganti halaman
const navigateToPage = function (targetPage) {
  pages.forEach((page) => {
    if (targetPage === page.dataset.page) {
      page.classList.add("active");
    } else {
      page.classList.remove("active");
    }
  });
};

// Event listener untuk navigasi
addEventOnElements(pageNavigation, "click", function () {
  const targetPage = this.textContent.toLowerCase();
  navigateToPage(targetPage);

  // Update active class di navbar
  pageNavigation.forEach((nav) => nav.classList.remove("active"));
  this.classList.add("active");
});

// Event listener untuk toggle sidebar
sidebarBtn.addEventListener("click", function () {
  sidebar.classList.toggle("active");
});


document.addEventListener("DOMContentLoaded", () => {
  updateStats();
  navigateToPage("dashboard");
});

setInterval(updateStats, 30000);
