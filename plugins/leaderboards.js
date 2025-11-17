const { EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

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
                .setTitle('❌ Belum Ada Data')
                .setDescription('Tidak ada pengguna di server ini yang memiliki data level. Mulai ngobrol untuk mendapatkan XP!');
            return message.reply({ embeds: [noDataEmbed] });
        }

        const sortedUsers = Object.entries(levelData[guildId])
            .sort(([, a], [, b]) => b.level - a.level || b.xp - a.xp)
            .slice(0, 10);

        let description = '';
        const medals = ['🥇', '🥈', '🥉'];

        for (let i = 0; i < sortedUsers.length; i++) {
            const [userId, data] = sortedUsers[i];
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) continue;

            const medal = medals[i] || '🏅';
            description += `${medal} **${user.username}** - Level **${data.level}** (${data.xp} XP)\n`;
        }

        const leaderboardEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Papan Peringkat Server')
            .setDescription(description)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Papan peringkat untuk ${message.guild.name}` })
            .setTimestamp();

        message.reply({ embeds: [leaderboardEmbed] });
    }
};