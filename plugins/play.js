const axios = require('axios');
const {
    VoiceConnectionStatus,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    getVoiceConnection
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const queues = new Map();
function createSongEmbed(metadata, type = 'play') {
    const embed = new EmbedBuilder()
        .setColor(type === 'play' ? '#0099ff' : '#ff3366')
        .setTitle(type === 'play' ? 'Song Added to Queue' : 'Now Playing')
        .setDescription(`**${metadata.title}**`)
        .addFields(
            { name: 'Channel', value: metadata.channel, inline: true },
            { name: 'Duration', value: metadata.duration, inline: true }
        )
        .setImage(metadata.cover)
        .setTimestamp()
        .setFooter({ text: 'Requested by ' + (metadata.requestedBy || 'User') });

    return embed;
}

// Fungsi untuk memutar lagu berikutnya
async function playNext(guildId, textChannel) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.songs.length > 0) {
        const nextSong = queue.songs.shift();
        queue.nowPlaying = nextSong;

        try {
            const response = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/play/v1?q=${encodeURIComponent(nextSong.searchTerm)}`);
            const data = response.data;

            if (data.success) {
                const { metadata, downloadUrl } = data.result;

                // Kirim embed lagu yang sedang diputar
                const embed = createSongEmbed(metadata, 'nowplaying');
                textChannel.send({ embeds: [embed] });

                // Buat audio resource dan mainkan
                const resource = createAudioResource(downloadUrl);
                queue.player.play(resource);
            }
        } catch (error) {
            console.error(error);
            textChannel.send("❌ Terjadi kesalahan saat memutar lagu berikutnya!");
            playNext(guildId, textChannel); // Coba lagu berikutnya
        }
    } else {
        const connection = getVoiceConnection(guildId);
        if (connection) {
            connection.destroy();
        }
        queues.delete(guildId);
        textChannel.send("All songs have been played, See You Next time :)");
    }
}

module.exports = {
    name: "play",
    description: "Memutar lagu atau menambahkan ke antrian",
    alias: ["p"],
    run: async (client, message, args) => {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply("Anda harus berada di voice channel!");
        }

        const searchTerm = args.join(" ");
        if (!searchTerm) {
            return message.reply("Silakan masukkan judul lagu atau link YouTube!");
        }

        try {
            // Tampilkan pesan loading
            const loadingMessage = await message.reply("Finding song...");

            // Panggil API nekolabs.web.id
            const response = await axios.get(`https://api.nekolabs.web.id/downloader/youtube/play/v1?q=${encodeURIComponent(searchTerm)}`);
            const data = response.data;

            // Hapus pesan loading
            loadingMessage.delete();

            // Periksa apakah pencarian berhasil
            if (!data.success) {
                return message.reply("❌ Tidak dapat menemukan lagu tersebut!");
            }

            const { metadata, downloadUrl } = data.result;

            // Tambahkan info pengguna ke metadata
            metadata.requestedBy = message.author.tag;
            metadata.searchTerm = searchTerm;

            // Periksa apakah server sudah memiliki queue
            let queue = queues.get(message.guild.id);

            if (!queue) {
                // Buat queue baru
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                connection.subscribe(player);

                // Buat queue baru
                queue = {
                    connection,
                    player,
                    songs: [],
                    nowPlaying: null,
                    textChannel: message.channel
                };

                queues.set(message.guild.id, queue);

                // Tambahkan lagu ke queue
                queue.nowPlaying = metadata;

                // Mainkan lagu pertama
                const resource = createAudioResource(downloadUrl);
                player.play(resource);

                // Kirim embed lagu yang sedang diputar
                const embed = createSongEmbed(metadata, 'nowplaying');
                message.channel.send({ embeds: [embed] });

                // Event saat lagu selesai
                player.on(AudioPlayerStatus.Idle, () => {
                    playNext(message.guild.id, message.channel);
                });

                // Event jika terjadi error
                player.on('error', (error) => {
                    console.error(error);
                    message.channel.send("❌ Terjadi kesalahan saat memutar lagu!");
                    playNext(message.guild.id, message.channel);
                });
            } else {
                // Tambahkan lagu ke queue yang sudah ada
                queue.songs.push(metadata);

                // Kirim embed lagu yang ditambahkan ke queue
                const embed = createSongEmbed(metadata, 'play');
                message.channel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error(error);
            message.reply("Terjadi kesalahan saat memutar lagu!");
        }
    },

    // Export queue system untuk digunakan oleh command lain
    queues
};