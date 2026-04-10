const fs = require("fs");
const path = require("path");

const COUNTS_FILE =
    process.env.MESSAGE_COUNT_FILE ||
    path.join(__dirname, "..", "data", "message_counts.json");
const SAVE_DEBOUNCE_MS = Number(process.env.MESSAGE_COUNT_SAVE_MS || 2000);
let saveTimer = null;

let counts = {};

function normalizeCounts(input) {
    if (!input || typeof input !== "object") return {};
    return input;
}

function loadCounts() {
    if (!fs.existsSync(COUNTS_FILE)) return;
    try {
        const raw = fs.readFileSync(COUNTS_FILE, "utf-8");
        if (!raw.trim()) return;
        const parsed = JSON.parse(raw);
        counts = normalizeCounts(parsed?.counts || parsed);
    } catch (error) {
        console.error("Failed to load message counts:", error?.message || error);
    }
}

function saveCounts() {
    try {
        const dir = path.dirname(COUNTS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const payload = {
            version: 1,
            updatedAt: new Date().toISOString(),
            counts,
        };
        fs.writeFileSync(COUNTS_FILE, JSON.stringify(payload, null, 2));
    } catch (error) {
        console.error("Failed to save message counts:", error?.message || error);
    }
}

function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveCounts();
    }, SAVE_DEBOUNCE_MS);
}

function incrementMessageCount(guildId, userId) {
    if (!guildId || !userId) return 0;
    if (!counts[guildId]) counts[guildId] = {};
    if (!counts[guildId][userId]) counts[guildId][userId] = 0;
    counts[guildId][userId] += 1;
    scheduleSave();
    return counts[guildId][userId];
}

function getMessageCount(guildId, userId) {
    if (!guildId || !userId) return 0;
    return counts[guildId]?.[userId] || 0;
}

function resetGuildCounts(guildId) {
    if (!guildId) return 0;
    const existing = counts[guildId] || {};
    const removed = Object.values(existing).reduce((sum, n) => sum + Number(n || 0), 0);
    delete counts[guildId];
    scheduleSave();
    return removed;
}

loadCounts();

module.exports = {
    incrementMessageCount,
    getMessageCount,
    resetGuildCounts,
};
