const { EmbedBuilder } = require("discord.js");
const { summarizeChat } = require("../utils/aiHelper");

module.exports = {
    name: "summary",
    alias: ["rangkum"],
    description: "Summarize channel activity",

    run: async (client, message, args) => {
        let channel = message.channel;

        if (args.length > 0) {
            const channelId = args[0].replace(/[<#>]/g, "");
            const targetChannel = message.guild.channels.cache.get(channelId);
            if (targetChannel && targetChannel.isTextBased()) {
                channel = targetChannel;
            } else {
                return message.reply("Channel tidak valid atau bukan text channel.");
            }
        }

        const loadingMsg = await message.reply("Sedang membaca pesan dan membuat rangkuman... ⏳");

        try {
            const fetchedMessages = await channel.messages.fetch({ limit: 50 });
            const chatContent = [...fetchedMessages.values()]
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .map(m => `${m.author.username}: ${m.content}`)
                .join("\n");

            if (!chatContent) {
                return loadingMsg.edit("Tidak ada pesan untuk dirangkum.");
            }

            const summary = await summarizeChat(chatContent);

            const embed = new EmbedBuilder()
                .setColor("#00FF00")
                .setTitle(`📝 Rangkuman Chat: ${channel.name}`)
                .setDescription(summary)
                .setFooter({ text: `Requested by ${message.author.tag}` })
                .setTimestamp();

            await loadingMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            console.error("Summary Error:", error);
            await loadingMsg.edit("Terjadi kesalahan saat membuat rangkuman.");
        }
    }
};
