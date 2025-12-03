const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "broadcast",
    alias: ["bc", "broadcast"],
    description: "Broadcast announcement about new Anime system to all servers in English (Owner Only)",
    run: async (client, message, args) => {
        if (message.author.id !== "870115369174564914") {
            return message.reply("You do not have permission to use this command.");
        }

        const embed = new EmbedBuilder()
            .setColor("#00FF88")
            .setTitle(" New Anime Search, Episode Navigation & Streaming System")
            .setDescription(
                "**We’ve added a complete anime browsing system in this bot. Search anime, view full details, navigate episodes, and watch instantly!**\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            )
            .addFields(
                {
                    name: "Search Anime",
                    value:
                        "Find anime instantly through the bot.\n" +
                        "**Command:** `!anime <title>`\n" +
                        "**Examples:** `!anime naruto`, `!anime one piece`, `!anime bleach`",
                    inline: false
                },
                {
                    name: "Anime Details",
                    value:
                        "View complete information:\n" +
                        "• Synopsis\n" +
                        "• Score rating\n" +
                        "• Genres\n" +
                        "• Airing status\n" +
                        "• Total episodes\n" +
                        "• Recommended similar anime (genre-based)",
                    inline: false
                },
                {
                    name: "Episode Navigation",
                    value:
                        "If an anime has many episodes, they’re grouped into pages of 25 each.\n" +
                        "**Page examples:**\n" +
                        "• Episode 1–25\n" +
                        "• Episode 26–50\n" +
                        "• Episode 51–75\n" +
                        "…and so on.",
                    inline: false
                },
                {
                    name: "Smart Back Navigation",
                    value:
                        "Smooth user experience without confusion or errors:\n" +
                        "• From Episode → Back to Episode List\n" +
                        "• From Episode List → Back to Page Selection\n" +
                        "• From Page Selection → Back to Anime Details\n" +
                        "• From Anime Details → Back to Search Results",
                    inline: false
                },
                {
                    name: "Streaming & Download",
                    value:
                        "Each episode provides stream & download links when available.\n" +
                        "Streaming opens directly via browser or media player.",
                    inline: false
                }
            )
            .addFields({
                name: "Need Help?",
                value: "If you have any questions or encounter issues: Contact <@870115369174564914>",
                inline: false
            })
            .setFooter({ text: "akhfhid-bot • Powered by Akhfhid Nime" })
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
