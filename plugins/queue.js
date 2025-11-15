const { EmbedBuilder } = require('discord.js');
const { queues } = require('./play.js');

// Fungsi untuk membuat embed queue
function createQueueEmbed(queue, guildName) {
    const embed = new EmbedBuilder()
        .setColor('#00ffcc')
        .setTitle(`Song Queue - ${guildName}`)
        .setDescription(`Now Playing: **${queue.nowPlaying.title}**`)
        .setTimestamp();

    if (queue.songs.length > 0) {
        const songList = queue.songs.slice(0, 10).map((song, index) =>
            `${index + 1}. **${song.title}** - ${song.duration}`
        ).join('\n');

        embed.addFields(
            { name: `Queue (${queue.songs.length} lagu)`, value: songList }
        );
    } else {
        embed.addFields(
            { name: 'Queue', value: 'Nothing song in queue.' }
        );
    }

    return embed;
}

module.exports = {
    name: "queue",
    description: "Menampilkan antrian lagu",
    alias: ["q"],
    run: async (client, message, args) => {
        const queue = queues.get(message.guild.id);
        if (!queue) {
            return message.reply("Nothing song in queue!");
        }

        const embed = createQueueEmbed(queue, message.guild.name);
        message.channel.send({ embeds: [embed] });
    }
};