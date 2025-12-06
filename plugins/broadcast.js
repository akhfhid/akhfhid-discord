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
            .setTitle("🎭 New Feature: Anonymous Confession System")
            .setDescription(
                "**Share your thoughts anonymously with our new confession system!**\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            )
            .addFields(
                {
                    name: "📝 Anonymous Confession Box",
                    value:
                        "Create a safe space for anonymous confessions in your server.\n" +
                        "**Admin Command:** `!confes #channel`\n" +
                        "**Features:**\n" +
                        "• Completely anonymous submissions\n" +
                        "• Auto-numbered confessions\n" +
                        "• Thread-based discussions\n" +
                        "• Reply button for each confession\n" +
                        "• Dynamic confession box (always at bottom)\n" +
                        "• Silent submission (no notifications)",
                    inline: false
                },
                {
                    name: "🔒 How It Works",
                    value:
                        "**For Admins:**\n" +
                        "1. Use `!confes #channel` to create a confession box\n" +
                        "2. The box will appear with a submit button\n" +
                        "3. Each confession gets auto-numbered\n\n" +
                        "**For Users:**\n" +
                        "1. Click 'Submit a Confession' button\n" +
                        "2. Fill in your confession (10-1000 characters)\n" +
                        "3. Submit anonymously - no one knows it's you!\n" +
                        "4. Click 'Reply' to respond in the thread",
                    inline: false
                },
                {
                    name: "✨ Key Features",
                    value:
                        "• **100% Anonymous** - Your identity is never revealed\n" +
                        "• **Thread Discussions** - Each confession gets its own thread\n" +
                        "• **Auto-Numbering** - Confessions numbered sequentially\n" +
                        "• **Clean Interface** - No spam, no clutter\n" +
                        "• **Always Updated** - Confession box stays at bottom\n" +
                        "• **Silent Mode** - No 'only you can see this' messages",
                    inline: false
                }
            )
            .addFields({
                name: "🚀 Get Started!",
                value:
                    "Admins can set up the confession box now:\n" +
                    "• Type `!confes #your-channel` to create a confession box\n" +
                    "• Users can then submit anonymous confessions\n" +
                    "• Everyone can reply anonymously in threads",
                inline: false
            })
            .addFields({
                name: "💡 Need Help?",
                value: "If you have any questions or encounter issues: Contact <@870115369174564914>",
                inline: false
            })
            .setFooter({ text: "akhfhid-bot • Your Privacy Matters" })
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
