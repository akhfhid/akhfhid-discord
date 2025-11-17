const { EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');

const levelDataPath = path.join(__dirname, '../data/levels.json');

function loadLevelData() {
    if (!fs.existsSync(levelDataPath)) return {};
    return JSON.parse(fs.readFileSync(levelDataPath, 'utf8'));
}

function createProgressBar(current, total, size = 10) {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((size * current) / total);
    const empty = size - filled;
    const filledBar = '▓'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    return `[${filledBar}${emptyBar}] ${percentage}%`;
}

module.exports = {
    name: "level",
    alias: ["rank", "lvl"],
    description: "Melihat level dan XP Anda atau pengguna lain",

    run: async (client, message, args) => {
        const levelData = loadLevelData();
        const guildId = message.guild.id;

        const targetUser = message.mentions.users.first() || message.author;
        const userId = targetUser.id;

        if (!levelData[guildId] || !levelData[guildId][userId]) {
            const noDataEmbed = new EmbedBuilder()
                .setColor('#FF5733')
                .setTitle('❌ Data Tidak Ditemukan')
                .setDescription(`${targetUser.tag} belum memiliki data level. Mulai ngobrol untuk mendapatkan XP!`);
            return message.reply({ embeds: [noDataEmbed] });
        }

        const user = levelData[guildId][userId];
        const xpForNextLevel = 5 * Math.pow(user.level + 1, 2) + (50 * (user.level + 1)) + 100;
        const progressBar = createProgressBar(user.xp, xpForNextLevel);

        const levelEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📊 Level ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🏆 Level', value: `**${user.level}**`, inline: true },
                { name: '✨ XP', value: `**${user.xp}** / **${xpForNextLevel}**`, inline: true },
                { name: '📈 Progress', value: progressBar, inline: false }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}` })
            .setTimestamp();

        message.reply({ embeds: [levelEmbed] });
    }
};

