const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../data/scheduleConfig.json');

let config = {};
if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
    name: "setschedule",
    description: "Mengatur channel dan status jadwal harian",
    alias: ["setsch"],
    permissions: "ManageGuild",
    run: async (client, message, args) => {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply("❌ Anda tidak memiliki izin `ManageGuild`!");
        }

        const channelMention = message.mentions.channels.first();

        if (channelMention) {
            if (!config[message.guild.id]) {
                config[message.guild.id] = {};
            }

            config[message.guild.id].channelId = channelMention.id;
            config[message.guild.id].enabled = true;
            saveConfig();

            return message.reply(`✅ Channel jadwal diatur ke ${channelMention}`);
        }

        const subCommand = args[0]?.toLowerCase();

        if (!subCommand) {
            const status = config[message.guild.id]?.enabled || false;
            const channel = client.channels.cache.get(config[message.guild.id]?.channelId);

            const embed = new EmbedBuilder()
                .setColor(status ? '#00FF00' : '#FF0000')
                .setTitle('⏰ Status Jadwal Harian')
                .addFields(
                    { name: 'Status', value: status ? '✅ Aktif' : '❌ Nonaktif', inline: true },
                    { name: 'Channel', value: channel ? channel.toString() : 'Tidak diatur', inline: true },
                    { name: 'Waktu', value: '07:30 Pagi', inline: true }
                )
                .setFooter({ text: 'Pesan akan bervariasi setiap hari menggunakan AI' })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }

        if (subCommand === 'enable') {
            if (!config[message.guild.id]) {
                config[message.guild.id] = {};
            }

            config[message.guild.id].enabled = true;
            saveConfig();

            return message.reply("✅ Jadwal harian telah diaktifkan!");
        }

        if (subCommand === 'disable') {
            if (!config[message.guild.id]) {
                config[message.guild.id] = {};
            }

            config[message.guild.id].enabled = false;
            saveConfig();

            return message.reply("❌ Jadwal harian telah dinonaktifkan!");
        }

        return message.reply("❌ Subcommand tidak valid! Gunakan: `!setschedule #channel` untuk mengatur channel, atau `!setschedule enable/disable` untuk mengaktifkan/menonaktifkan.");
    },

    view: {
        name: "schedule",
        description: "Melihat jadwal harian",
        alias: ["sch", "jadwal"],
        run: async (client, message, args) => {
            const config = require(configPath);
            const schedule = config[message.guild.id];

            if (!schedule || !schedule.enabled) {
                return message.reply("⚠️ Belum ada jadwal yang diatur untuk server ini.");
            }

            const channel = client.channels.cache.get(schedule.channelId);
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('⏰ Status Jadwal Harian')
                .addFields(
                    { name: 'Status', value: schedule.enabled ? '✅ Aktif' : '❌ Nonaktif', inline: true },
                    { name: 'Channel', value: channel ? channel.toString() : 'Tidak diatur', inline: true },
                    { name: 'Waktu', value: '07:30 Pagi', inline: true }
                )
                .setFooter({ text: 'Pesan akan bervariasi setiap hari menggunakan AI' })
                .setTimestamp();

            return message.channel.send({ embeds: [embed] });
        }
    }
};