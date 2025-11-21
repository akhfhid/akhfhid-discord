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
const ffmpegPath = require('ffmpeg-static');
const queues = new Map();
const akhfhid = process.env.BASE_API;

// Ensure ffmpeg path is set for @discordjs/voice if needed
process.env.FFMPEG_PATH = ffmpegPath;

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

async function playNext(guildId, textChannel) {
    const queue = queues.get(guildId);
    if (!queue) return;

    if (queue.songs.length > 0) {
        const nextSong = queue.songs.shift();
        queue.nowPlaying = nextSong;

        try {
            const response = await axios.get(`https://api-faa.my.id/faa/ytplay?query=${encodeURIComponent(nextSong.searchTerm)}`);
            const data = response.data;

            if (data.status) {
                const result = data.result;
                const metadata = {
                    title: result.title,
                    channel: result.author,
                    duration: result.duration,
                    cover: result.thumbnail,
                    requestedBy: nextSong.requestedBy
                };
                const downloadUrl = result.mp3;
                console.log("Playing URL (next):", downloadUrl);
                
                const streamResponse = await axios.get(downloadUrl, { responseType: 'stream' });
                const resource = createAudioResource(streamResponse.data);
                
                const embed = createSongEmbed(metadata, 'nowplaying');
                textChannel.send({ embeds: [embed] });
                queue.player.play(resource);
            } else {
                textChannel.send("❌ Gagal memuat lagu berikutnya.");
                playNext(guildId, textChannel);
            }
        } catch (error) {
            console.error(error);
            textChannel.send("❌ Terjadi kesalahan saat memutar lagu berikutnya!");
            playNext(guildId, textChannel);
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
            const loadingMessage = await message.reply("Finding song...");
            const response = await axios.get(`https://api-faa.my.id/faa/ytplay?query=${encodeURIComponent(searchTerm)}`);
            const data = response.data;
            loadingMessage.delete();
            
            if (!data.status) {
                return message.reply("❌ Tidak dapat menemukan lagu tersebut!");
            }

            const result = data.result;
            const metadata = {
                title: result.title,
                channel: result.author,
                duration: result.duration,
                cover: result.thumbnail,
                requestedBy: message.author.tag,
                searchTerm: searchTerm
            };
            const downloadUrl = result.mp3;
            console.log("Playing URL:", downloadUrl);
            
            let queue = queues.get(message.guild.id);

            if (!queue) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });

                const player = createAudioPlayer();
                connection.subscribe(player);

                // DEBUG: Monitor Voice Connection State
                connection.on('stateChange', (oldState, newState) => {
                    console.log(`Connection transitioned from ${oldState.status} to ${newState.status}`);
                });

                // DEBUG: Monitor Audio Player State
                player.on('stateChange', (oldState, newState) => {
                    console.log(`Audio player transitioned from ${oldState.status} to ${newState.status}`);
                });

                player.on('error', error => {
                    console.error('Audio Player Error:', error);
                });

                queue = {
                    connection,
                    player,
                    songs: [],
                    nowPlaying: null,
                    textChannel: message.channel
                };
                queues.set(message.guild.id, queue);
                queue.nowPlaying = metadata;
                
                const streamResponse = await axios.get(downloadUrl, { responseType: 'stream' });
                const resource = createAudioResource(streamResponse.data);
                player.play(resource);

                const embed = createSongEmbed(metadata, 'nowplaying');
                message.channel.send({ embeds: [embed] });
                player.on(AudioPlayerStatus.Idle, () => {
                    console.log("Audio Player Idle");
                    playNext(message.guild.id, message.channel);
                });

                player.on('error', (error) => {
                    console.error(error);
                    message.channel.send("❌ Terjadi kesalahan saat memutar lagu!");
                    playNext(message.guild.id, message.channel);
                });
            } else {
                queue.songs.push(metadata);

                const embed = createSongEmbed(metadata, 'play');
                message.channel.send({ embeds: [embed] });
            }

        } catch (error) {
            console.error(error);
            message.reply("Terjadi kesalahan saat memutar lagu!");
        }
    },
    queues
};