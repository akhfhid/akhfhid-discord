const { EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { getMessageCount } = require("../utils/messageCounter");

const levelDataPath = path.join(__dirname, '../data/levels.json');

function loadLevelData() {
    if (!fs.existsSync(levelDataPath)) return {};
    return JSON.parse(fs.readFileSync(levelDataPath, 'utf8'));
}

module.exports = {
    name: "leaderboard",
    alias: ["top", "lb"],
    description: "Menampilkan 10 pengguna dengan level tertinggi di server",

    run: async (client, message, args) => {
        const levelData = loadLevelData();
        const guildId = message.guild.id;

        if (!levelData[guildId] || Object.keys(levelData[guildId]).length === 0) {
            const noDataEmbed = new EmbedBuilder()
                .setColor('#FF5733')
                .setTitle('Belum Ada Data')
                .setDescription('Belum ada data level di server ini. Mulai ngobrol untuk mendapatkan XP.');
            return message.reply({ embeds: [noDataEmbed] });
        }

        const sortedUsers = Object.entries(levelData[guildId])
            .sort(([, a], [, b]) => b.level - a.level || b.xp - a.xp)
            .slice(0, 10);

        let description = '';

        for (let i = 0; i < sortedUsers.length; i++) {
            const [userId, data] = sortedUsers[i];
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) continue;

            const rank = String(i + 1).padStart(2, '0');
            const safeName = user.username.replace(/\s+/g, " ").trim();
            const msgCount = getMessageCount(guildId, userId);
            description += `${rank}  ${safeName}  ${data.level}  ${data.xp}  ${msgCount}\n`;
        }

        const NAME_COL_WIDTH = 22;
        const XP_COL_WIDTH = 5;
        const MSG_COL_WIDTH = 6;

        const header = `RK  ${"USERNAME".padEnd(NAME_COL_WIDTH, " ")}  LV  ${"XP".padStart(XP_COL_WIDTH, " ")}  ${"MSG".padStart(MSG_COL_WIDTH, " ")}`;
        const separator = "-".repeat(header.length);
        const rows = description
            .trim()
            .split("\n")
            .map((line) => {
                const [rk, name, lv, xp, msg] = line.split("  ");
                const nameCol = (name || "").slice(0, NAME_COL_WIDTH).padEnd(NAME_COL_WIDTH, " ");
                const lvCol = String(lv || "").padStart(2, " ");
                const xpCol = String(xp || "").padStart(XP_COL_WIDTH, " ");
                const msgCol = String(msg || "").padStart(MSG_COL_WIDTH, " ");
                return `${rk}  ${nameCol}  ${lvCol}  ${xpCol}  ${msgCol}`;
            })
            .join("\n");

        const body =
            `Ranking ${message.guild.name} — Top 10 pengguna\n\n` +
            `\`\`\`\n${header}\n${separator}\n${rows}\n\`\`\``;

        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`Leaderboard — ${message.guild.name}`)
            .setDescription(body)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Top 10 berdasarkan Level dan XP` })
            .setTimestamp();

        message.reply({ embeds: [leaderboardEmbed] });
    }
};
