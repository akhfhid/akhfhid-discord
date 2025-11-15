const { getVoiceConnection } = require('@discordjs/voice');
const { queues } = require('./play.js');

module.exports = {
    name: "stop",
    description: "Stopping the song and clearing the queue ",
    alias: ["st"],
    run: async (client, message, args) => {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply("Anda harus berada di voice channel!");
        }
        const queue = queues.get(message.guild.id);
        if (!queue) {
            return message.reply("Tidak ada lagu yang sedang diputar!");
        }
        queue.player.stop();
        queue.songs = [];
        queue.connection.destroy();
        queues.delete(message.guild.id);
        message.reply(" Song stopped and queue cleared !");
    }
};