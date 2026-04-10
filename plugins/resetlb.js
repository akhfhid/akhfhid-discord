const fs = require("fs");
const path = require("path");
const { resetGuildCounts } = require("../utils/messageCounter");

const levelDataPath = path.join(__dirname, "../data/levels.json");

function loadLevelData() {
    if (!fs.existsSync(levelDataPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(levelDataPath, "utf8"));
    } catch {
        return {};
    }
}

function saveLevelData(data) {
    const dir = path.dirname(levelDataPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(levelDataPath, JSON.stringify(data, null, 2));
}

module.exports = {
    name: "resetlb",
    description: "Reset data leaderboard server (Admin only)",
    alias: ["resetleaderboard", "lbreset"],
    run: async (client, message) => {
        const isAdmin = message.member?.permissions?.has("Administrator") ||
            message.member?.permissions?.has("ManageGuild");

        if (!isAdmin) {
            await message.reply("Hanya admin yang bisa reset leaderboard.");
            return;
        }

        const guildId = message.guild?.id;
        if (!guildId) {
            await message.reply("Guild tidak ditemukan.");
            return;
        }

        const levelData = loadLevelData();
        const userCount = Object.keys(levelData[guildId] || {}).length;
        delete levelData[guildId];
        saveLevelData(levelData);

        const removedMessages = resetGuildCounts(guildId);

        await message.reply(
            `Leaderboard reset untuk server ini.\n` +
            `Data level terhapus: ${userCount} user.\n` +
            `Total pesan direset: ${removedMessages}.`
        );
    },
};
