const { EmbedBuilder } = require("discord.js");
const { summarizeChat } = require("../utils/aiHelper");

module.exports = {
    name: "summary",
    alias: ["rangkum", "sum"],
    description: "Merangkum aktivitas chat channel",

    run: async (client, message, args) => {
        let channel = message.channel;

        if (args.length > 0) {
            const channelId = args[0].replace(/[<#>]/g, "");
            const targetChannel = message.guild.channels.cache.get(channelId);
            if (targetChannel && targetChannel.isTextBased()) {
                channel = targetChannel;
            } else {
                return message.reply("Channel tidak valid atau bukan channel teks.");
            }
        }

        let seconds = 0;
        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('📝 Ringkasan Chat')
            .setDescription(`Sedang menganalisis pesan di ${channel.toString()}...`)
            .setTimestamp()
            .addFields(
                { name: '⏱️ Durasi', value: `0 Detik`, inline: true },
                { name: '📊 Status', value: `Mengambil pesan...`, inline: true }
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}` });

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        const timer = setInterval(() => {
            seconds++;
            const updated = EmbedBuilder.from(loadingEmbed)
                .setFields(
                    { name: '⏱️ Durasi', value: `${seconds} Detik`, inline: true },
                    { name: '📊 Status', value: `Memproses konten...`, inline: true }
                );
            loadingMsg.edit({ embeds: [updated] }).catch(() => { });
        }, 1000);

        try {
            const fetchedMessages = await channel.messages.fetch({ limit: 50 });
            const chatContent = [...fetchedMessages.values()]
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .map(m => `${m.author.username}: ${m.content}`)
                .join("\n");

            if (!chatContent) {
                clearInterval(timer);
                return loadingMsg.edit({ content: "Tidak ada pesan untuk dirangkum.", embeds: [] });
            }

            const summary = await summarizeChat(chatContent);

            clearInterval(timer);

            const embed = new EmbedBuilder()
                .setColor("#00AAFF")
                .setTitle("Laporan Ringkasan Chat")
                .setDescription(`**Ringkasan percakapan terbaru di ${channel.toString()}**\n\n${summary}`)
                .addFields(
                    {
                        name: "Channel",
                        value: `\`#${channel.name}\``,
                        inline: true
                    },
                    {
                        name: "Pesan Dianalisis",
                        value: `\`${fetchedMessages.size} pesan\``,
                        inline: true
                    },
                    {
                        name: "⏱️ Durasi",
                        value: `\`${seconds} Detik\``,
                        inline: true
                    }
                )
                .setFooter({ text: `Diminta oleh ${message.author.tag}` })
                .setTimestamp();

            await loadingMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            clearInterval(timer);
            console.error("Summary Error:", error);
            await loadingMsg.edit({ content: "Terjadi kesalahan saat membuat ringkasan.", embeds: [] });
        }

    }
};
