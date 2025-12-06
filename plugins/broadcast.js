const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "broadcast",
    alias: ["bc", "broadcast"],
    description: "Broadcast announcement about new features to all servers (Owner Only)",
    run: async (client, message, args) => {
        if (message.author.id !== "870115369174564914") {
            return message.reply("You do not have permission to use this command.");
        }

        const embed = new EmbedBuilder()
            .setColor("#9B59B6")
            .setTitle("New AI Features: Fortune Teller & Vibe Check")
            .setDescription(
                "**We've added two exciting AI-powered features to enhance your server experience!**\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            )
            .addFields(
                {
                    name: "Fortune Teller - Mystical AI Readings",
                    value:
                        "Get personalized fortune readings powered by AI.\n" +
                        "**Command:** `!fortune`\n" +
                        "**Features:**\n" +
                        "• Interactive category selection menu\n" +
                        "• 6 categories: Love, Career, Health, Finance, Today, General\n" +
                        "• Mystical and poetic fortune readings in Indonesian\n" +
                        "• 24-hour cooldown per category\n" +
                        "• Real-time loading with response timer",
                    inline: false
                },
                // {
                //     name: "Tarot Card Reading",
                //     value:
                //         "Receive mystical tarot interpretations.\n" +
                //         "**Command:** `!tarot`\n" +
                //         "**Features:**\n" +
                //         "• 78 complete tarot cards (Major & Minor Arcana)\n" +
                //         "• 3-card spread: Past, Present, Future\n" +
                //         "• AI-powered mystical interpretations\n" +
                //         "• Available once per 24 hours",
                //     inline: false
                // },
                {
                    name: "Vibe Check - Personality Analysis",
                    value:
                        "Analyze personality and vibes with AI.\n" +
                        "**Commands:**\n" +
                        "• `!vibecheck` - Check your own vibe\n" +
                        "• `!vibecheck @user` - Check someone else's vibe\n" +
                        "• `!vibecheck #channel` - Check channel vibe\n" +
                        "**Features:**\n" +
                        "• Witty and entertaining AI analysis\n" +
                        "• Vibe score (0-100) with color coding\n" +
                        "• Analyzes recent chat messages\n" +
                        "• No cooldown - use anytime!",
                    inline: false
                },
                {
                    name: "Vibe Score System",
                    value:
                        "• **80-100:** Vibes Positif (Green)\n" +
                        "• **60-79:** Vibes Santai (Blue)\n" +
                        "• **40-59:** Vibes Campur (Yellow)\n" +
                        "• **20-39:** Vibes Kacau (Orange)\n" +
                        "• **0-19:** Vibes Toxic (Red)",
                    inline: false
                }
            )
            .addFields({
                name: "Try It Now!",
                value:
                    "Start exploring these mystical features:\n" +
                    "• Type `!fortune` for your daily fortune\n" +
                    "• Type `!tarot` for tarot card reading\n" +
                    "• Type `!vibecheck` to check your vibe",
                inline: false
            })
            .addFields({
                name: "Need Help?",
                value: "If you have any questions or encounter issues: Contact <@870115369174564914>",
                inline: false
            })
            .setFooter({ text: "akhfhid-bot • Powered by AI" })
            .setTimestamp();


        let successCount = 0;
        let successServers = [];
        let failedServers = [];
        const guilds = client.guilds.cache.map(g => g);

        message.reply("Starting broadcast announcement...");

        for (const guild of guilds) {
            let channel = guild.systemChannel;
            if (!channel) {
                channel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has("SendMessages"));
            }

            if (channel) {
                try {
                    await channel.send({ embeds: [embed] });
                    successCount++;
                    successServers.push(guild.name);
                } catch (e) {
                    console.error(`Failed to send to server ${guild.name}:`, e);
                    failedServers.push(guild.name);
                }
            } else {
                failedServers.push(guild.name);
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(successCount > 0 ? "#00FF00" : "#FF0000")
            .setTitle("Broadcast Report")
            .setDescription(
                `**Status:** ${successCount > 0 ? "Completed" : "Failed"}\n` +
                `**Total Servers:** ${guilds.length}\n` +
                `**Success:** ${successCount} servers\n` +
                `**Failed:** ${failedServers.length} servers`
            )
            .addFields({
                name: `Successful Broadcasts (${successCount})`,
                value: successServers.length > 0
                    ? successServers.map(name => `\`${name}\``).join(", ")
                    : "None",
                inline: false
            })
            .setFooter({ text: `Broadcast completed at` })
            .setTimestamp();

        if (failedServers.length > 0) {
            resultEmbed.addFields({
                name: `Failed Broadcasts (${failedServers.length})`,
                value: failedServers.map(name => `\`${name}\``).join(", "),
                inline: false
            });
        }

        message.channel.send({ embeds: [resultEmbed] });
    }
};
