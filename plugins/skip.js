const { getVoiceConnection } = require('@discordjs/voice');
const { queues } = require('./play.js');

module.exports = {
    name: "skip",
    description: " Song Skipped!",
    alias: ["s"],
    run: async (client, message, args) => {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply("Anda harus berada di voice channel!");
        }

        const queue = queues.get(message.guild.id);
        if (!queue) {
            return message.reply("Nothing song in queue!");
        }

        queue.player.stop();
        message.reply("Song Skipped!");
    }
};