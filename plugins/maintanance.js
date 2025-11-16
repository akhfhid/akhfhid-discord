const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "maintenance",
    alias: ["maint"],
    description: "Kirim pengumuman server maintenance ke channel tertentu",
    run: async (client, message, args) => {

        // Cek apakah user mention channel
        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply(
                "❗ Kamu harus mention channel!\n\n" +
                "Contoh:\n" +
                "`!maintenance #announcement 20/11/2025 21:00 21/11/2025 03:00`"
            );
        }

        // Remove channel mention dari args
        args.shift();

        // Cek jumlah args setelah channel dihapus
        if (args.length < 4) {
            return message.reply(
                "❗ Format salah!\nGunakan:\n" +
                "`!maintenance #channel <tgl_mulai> <jam_mulai> <tgl_selesai> <jam_selesai>`\n\n" +
                "**Contoh:**\n" +
                "`!maintenance #announcement 20/11/2025 21:00 21/11/2025 03:00`"
            );
        }

        const startDate = args[0];  // 20/11/2025
        const startTime = args[1];  // 21:00
        const endDate = args[2];    // 21/11/2025
        const endTime = args[3];    // 03:00

        // Buat embed
        const embed = new EmbedBuilder()
            .setColor("#ff3333")
            .setTitle("🔧 Server Maintenance Notification")
            .setDescription(
                "**Halo semuanya!**\n\n" +
                "Server akan memasuki masa **maintenance** untuk peningkatan performa dan pembaruan sistem.\n\n" +
                `**⏰ Waktu:**\n` +
                `Mulai: **${startDate} — ${startTime}**\n` +
                `Selesai: **${endDate} — ${endTime}**\n\n` +
                "**📝 Detail:**\n" +
                "- Optimalisasi sistem\n" +
                "- Perbaikan bug\n" +
                "- Peningkatan keamanan\n\n" +
                "> Mohon maaf atas ketidaknyamanan ini, dan terima kasih atas pengertiannya!"
            )
            .setFooter({ text: "Server Maintenance Announcement" })
            .setTimestamp();

        // Kirim ke channel yang disebut
        channel.send({ embeds: [embed] });

        // Konfirmasi ke user
        message.reply(`✅ Pengumuman maintenance telah dikirim ke ${channel}!`);
    }
};
