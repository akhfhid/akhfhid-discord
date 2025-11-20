// --- FUNGSI NAVIGASI TAB ---
const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const targetPage = link.getAttribute("data-target");

    // Hapus kelas active dari semua link dan halaman
    navLinks.forEach((l) => l.classList.remove("active"));
    pages.forEach((p) => p.classList.remove("active"));

    // Tambahkan kelas active ke link dan halaman yang diklik
    link.classList.add("active");
    document.getElementById(targetPage).classList.add("active");
  });
});

// --- FUNGSI STATISTIK & ANIMASI ---

// Fungsi untuk menghitung uptime
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes % 60}m`;
}

// Fungsi animasi count-up
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  const range = end - start;
  const minTimer = 50;
  let stepTime = Math.abs(Math.floor(duration / range));
  stepTime = Math.max(stepTime, minTimer);
  const startTime = new Date().getTime();
  const endTime = startTime + duration;
  let timer;

  function run() {
    const now = new Date().getTime();
    const remaining = Math.max((endTime - now) / duration, 0);
    const value = Math.round(end - remaining * range);
    obj.innerHTML = value.toLocaleString("id-ID");
    if (value == end) {
      clearInterval(timer);
    }
  }

  timer = setInterval(run, stepTime);
  run();
}

// Fungsi untuk mengambil dan memperbarui statistik
async function updateStats() {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) throw new Error("Network response was not ok");
    const stats = await response.json();

    // Update uptime
    document.getElementById("uptime").innerText = formatUptime(stats.uptime);

    // Update server count dengan animasi
    const currentServerCount = parseInt(
      document.getElementById("server-count").innerText.replace(/\D/g, "") || 0
    );
    if (currentServerCount !== stats.serverCount) {
      animateValue("server-count", currentServerCount, stats.serverCount, 1000);
    }

    // Update user count dengan animasi
    const currentUserCount = parseInt(
      document.getElementById("user-count").innerText.replace(/\D/g, "") || 0
    );
    if (currentUserCount !== stats.userCount) {
      animateValue("user-count", currentUserCount, stats.userCount, 1500);
    }
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    document.getElementById("uptime").innerText = "Error";
    document.getElementById("server-count").innerText = "Error";
    document.getElementById("user-count").innerText = "Error";
  }
}

// --- INISIALISASI ---
document.addEventListener("DOMContentLoaded", () => {
  updateStats();
  // Update setiap 30 detik
  setInterval(updateStats, 30000);
});
