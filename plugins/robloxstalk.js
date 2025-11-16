const axios = require("axios");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const akhfhid = process.env.BASE_URL;
module.exports = {
    name: "roblox",
    description: "Cek informasi lengkap pengguna Roblox",
    aliases: ["rb", "rblx"],
    run: async (client, message, args) => {
        const user = args.join(" ");
        if (!user)
            return message.reply("Masukkan username Roblox!\ncontoh: `!roblox fannn6`");

        let seconds = 0;

        // === LOADING EMBED ===
        const loadingEmbed = new EmbedBuilder()
            .setColor("#FFFF00")
            .setTitle("🔍 Roblox Lookup")
            .setDescription(`Sedang mencari informasi tentang:\n**${user}**`)
            .addFields(
                { name: "⏱️ Durasi", value: "0 detik", inline: true },
                { name: "📡 Status", value: "Menghubungi API Roblox...", inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        // TIMER UPDATE PER DETIK
        const timer = setInterval(() => {
            seconds++;

            const update = EmbedBuilder.from(loadingEmbed)
                .setFields(
                    { name: "⏱️ Durasi", value: `${seconds} detik`, inline: true },
                    { name: "📡 Status", value: "Mengambil data avatar & profile...", inline: true }
                );

            loadingMsg.edit({ embeds: [update] }).catch(() => { });
        }, 1000);

        try {
            const { data } = await axios.get(
                `${akhfhid}/stalker/roblox?user=${encodeURIComponent(user)}`
            );

            clearInterval(timer);

            if (!data.success || !data.data) {
                return loadingMsg.edit("❌ Tidak ditemukan atau API sedang bermasalah.");
            }

            const rbx = data.data;

            const createdDate = new Date(rbx.basic.created).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            const avatar = rbx.avatar.fullBody.data[0]?.imageUrl;
            const headshot = rbx.avatar.headshot.data[0]?.imageUrl;

            const embed = new EmbedBuilder()
                .setColor("#00AAFF")
                .setTitle(`👤 Roblox Profile — ${rbx.basic.displayName}`)
                .setThumbnail(headshot)
                .setImage(avatar)
                .setDescription(
                    `**Username:** ${rbx.basic.name}\n` +
                    `**User ID:** ${rbx.userId}\n` +
                    `**Akun Dibuat:** ${createdDate}\n` +
                    `**Status Ban:** ${rbx.basic.isBanned ? "Dibanned" : "Tidak dibanned"
                    }\n` +
                    `**Jejaring Sosial:**\n` +
                    `• Friends: ${rbx.social.friends.count}\n` +
                    `• Followers: ${rbx.social.followers.count}\n` +
                    `• Following: ${rbx.social.following.count}\n\n` +
                    `**Aktivitas Terakhir:** ${rbx.presence?.userPresences?.[0]?.lastLocation || "Tidak diketahui"
                    }\n` +
                    `**⏱ Waktu Pencarian:** ${seconds} detik`
                )
                .setFooter({ text: `Requested by ${message.author.tag}` })
                .setTimestamp();


            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel("Avatar Full").setURL(avatar).setStyle(ButtonStyle.Link),
                new ButtonBuilder().setLabel("Headshot").setURL(headshot).setStyle(ButtonStyle.Link)
            );

            await loadingMsg.edit({
                embeds: [embed],
                components: [row]
            });

        } catch (err) {
            clearInterval(timer);
            console.error(err);
            loadingMsg.edit("❌ Terjadi error memproses data Roblox!");
        }
    }
};
