const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "maintdone",
    alias: ["mdone"],
    description: "Kirim pengumuman bahwa maintenance telah selesai",

    run: async (client, message, args) => {
        // Ambil channel dari mention
        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply(
                "❗ Kamu harus mention channel!\n\n" +
                "Contoh:\n" +
                "`!maintdone #announcement`"
            );
        }

        // Buat embed
        const embed = new EmbedBuilder()
            .setColor("#00cc66")
            .setTitle("Maintenance Completed")
            .setDescription(
                "**Maintenance selesai!**\n\n" +
                "Server sekarang sudah kembali **online** dan siap digunakan.\n\n" +
                "**✔ Perubahan & Perbaikan:**\n" +
                "- Optimisasi performa server\n" +
                "- Perbaikan bug yang dilaporkan\n" +
                "- Peningkatan keamanan\n\n" +
                "> Jika kamu menemukan bug atau masalah lain, mohon laporkan ya!"
            )
            .setFooter({ text: "Server is now back online" })
            .setTimestamp();

        channel.send({ embeds: [embed] });

        message.reply(`Pengumuman Maintenance telah dikirim ke ${channel}!`);
    }
};
