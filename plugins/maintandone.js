const { EmbedBuilder, ChannelType } = require("discord.js");

module.exports = {
    name: "maintdone",
    alias: ["mdone"],
    description: "Kirim pengumuman bahwa maintenance telah selesai ke semua server",

    run: async (client, message, args) => {

        const announceEmbed = new EmbedBuilder()
            .setColor("#00cc66")
            .setTitle("Maintenance Completed")
            .setDescription(
                "**Maintenance selesai!**\n\n" +
                "Server sekarang sudah kembali **online** dan siap digunakan.\n\n" +
                "**✔ Perubahan & Perbaikan:**\n" +
                "- Optimisasi performa server\n" +
                "- Penambahan fitur baru\n" +
                "- Optimisasi server\n" +
                "- Peningkatan keamanan\n\n" +
                "> Jika kamu menemukan bug atau masalah lain, mohon laporkan ya!"
            )
            .setFooter({ text: "Server is now back online" })
            .setTimestamp();

        let success = [];
        let failed = [];

        for (const guild of client.guilds.cache.values()) {

            const channel = guild.channels.cache.find(
                ch =>
                    ch.type === ChannelType.GuildText &&
                    ch.permissionsFor(guild.members.me).has("SendMessages")
            );

            if (!channel) {
                failed.push(`${guild.name} (no channel access)`);
                continue;
            }

            try {
                await channel.send({ embeds: [announceEmbed] });
                success.push(`${guild.name}`);
            } catch (err) {
                failed.push(`${guild.name} (send failed)`);
            }
        }

        // 🔵 Embed laporan
        const reportEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Maintenance Broadcast Report")
            .setDescription(
                `Pengumuman maintenance berhasil dikirim ke **${success.length} server**.\n` +
                `Gagal dikirim ke **${failed.length} server**.\n\n` +
                "Berikut detailnya:"
            )
            .addFields(
                {
                    name: "Berhasil",
                    value: success.length > 0 ? success.join("\n") : "Tidak ada",
                    inline: false
                },
                {
                    name: "Gagal",
                    value: failed.length > 0 ? failed.join("\n") : "Tidak ada",
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({ text: "Maintenance Broadcast Summary" });

        message.reply({ embeds: [reportEmbed] });
    }
};
