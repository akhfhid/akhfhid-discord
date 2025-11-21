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
    if (!obj) return;
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

        // Update statistik lama
        const uptimeEl = document.getElementById("uptime");
        if (uptimeEl) uptimeEl.innerText = formatUptime(stats.uptime);

        const serverCountEl = document.getElementById("server-count");
        if (serverCountEl) {
            const currentServerCount = parseInt(
                serverCountEl.innerText.replace(/\D/g, "") || 0
            );
            if (currentServerCount !== stats.serverCount) {
                animateValue("server-count", currentServerCount, stats.serverCount, 1000);
            }
        }

        const userCountEl = document.getElementById("user-count");
        if (userCountEl) {
            const currentUserCount = parseInt(
                userCountEl.innerText.replace(/\D/g, "") || 0
            );
            if (currentUserCount !== stats.userCount) {
                animateValue("user-count", currentUserCount, stats.userCount, 1500);
            }
        }

        // --- UPDATE INFO SERVER BARU ---
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.innerText = val;
        };

        setVal("cpu-load", stats.cpuLoad);
        setVal("memory-usage", stats.memoryUsage);
        setVal("node-version", stats.nodeVersion);
        setVal("api-ping", `${stats.ping}ms`);
        setVal("djs-version", `v${stats.discordJsVersion}`);
        setVal("platform", stats.platform);
        setVal("server-uptime", formatUptime(stats.serverUptime * 1000));
        setVal("commands-run", stats.commandsRun.toLocaleString("id-ID"));

        const statusEl = document.getElementById("bot-status");
        const indicatorEl = document.getElementById("status-indicator");
        if (statusEl && indicatorEl) {
            if (stats.botStatus === "Online") {
                statusEl.innerText = "Online";
                indicatorEl.className = "fas fa-circle online";
            } else {
                statusEl.innerText = "Offline";
                indicatorEl.className = "fas fa-circle offline";
            }
        }
    } catch (error) {
        console.error("Failed to fetch stats:", error);
        // Tampilkan error pada info server
        const serverInfoIds = [
            "cpu-load",
            "memory-usage",
            "node-version",
            "api-ping",
            "djs-version",
            "platform",
        ];
        serverInfoIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.innerText = "Error";
        });
    }
}

// --- INISIALISASI ---
document.addEventListener("DOMContentLoaded", () => {
    updateStats();
    setInterval(updateStats, 30000);
});
