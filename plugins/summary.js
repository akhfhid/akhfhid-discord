const { EmbedBuilder } = require("discord.js");
const { summarizeChat } = require("../utils/aiHelper");

module.exports = {
    name: "summary",
    alias: ["rangkum", "sum"],
    description: "Summarize channel activity",

    run: async (client, message, args) => {
        let channel = message.channel;

        if (args.length > 0) {
            const channelId = args[0].replace(/[<#>]/g, "");
            const targetChannel = message.guild.channels.cache.get(channelId);
            if (targetChannel && targetChannel.isTextBased()) {
                channel = targetChannel;
            } else {
                return message.reply("Invalid channel or not a text channel.");
            }
        }

        let seconds = 0;
        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('📝 Chat Summary')
            .setDescription(`Analyzing messages in ${channel.toString()}...`)
            .setTimestamp()
            .addFields(
                { name: '⏱️ Duration', value: `0 Sec`, inline: true },
                { name: '📊 Status', value: `Fetching messages...`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        const timer = setInterval(() => {
            seconds++;
            const updated = EmbedBuilder.from(loadingEmbed)
                .setFields(
                    { name: '⏱️ Duration', value: `${seconds} Sec`, inline: true },
                    { name: '📊 Status', value: `Processing content...`, inline: true }
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
                return loadingMsg.edit({ content: "No messages found to summarize.", embeds: [] });
            }

            const summary = await summarizeChat(chatContent);

            clearInterval(timer);

            const embed = new EmbedBuilder()
                .setColor("#00AAFF")
                .setTitle("Chat Summary Report")
                .setDescription(`**Summary of recent conversation in ${channel.toString()}**\n\n${summary}`)
                .addFields(
                    {
                        name: "Channel",
                        value: `\`#${channel.name}\``,
                        inline: true
                    },
                    {
                        name: "Messages Analyzed",
                        value: `\`${fetchedMessages.size} messages\``,
                        inline: true
                    },
                    {
                        name: "⏱️ Duration",
                        value: `\`${seconds} Sec\``,
                        inline: true
                    }
                )
                .setFooter({ text: `Requested by ${message.author.tag}` })
                .setTimestamp();

            await loadingMsg.edit({ content: null, embeds: [embed] });

        } catch (error) {
            clearInterval(timer);
            console.error("Summary Error:", error);
            await loadingMsg.edit({ content: "An error occurred while generating the summary.", embeds: [] });
        }

    }
};
