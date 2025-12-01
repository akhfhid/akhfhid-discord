const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "broadcast",
    alias: ["bc"],
    description: "Broadcast announcement about latest features to all servers (Owner Only)",
    run: async (client, message, args) => {
        if (message.author.id !== "870115369174564914") {
            return message.reply("You do not have permission to use this command.");
        }

        const embed = new EmbedBuilder()
            .setColor("#00FFFF")
            .setTitle(" New AI-Powered Features Available")
            .setDescription(
                "**Exciting updates! We've added powerful AI features to enhance your experience.**\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            )
            .addFields(
                {
                    name: "AI Text-to-Speech",
                    value:
                        "Convert text into natural-sounding AI voices.\n" +
                        "**Command:** `!tts <your text>`\n" +
                        "**Voices:** Alloy, Echo, Fable, Onyx, Nova, Shimmer\n" +
                        "**Example:** `!tts Welcome to our server!`",
                    inline: false
                },
                {
                    name: "AI Image Transformation",
                    value:
                        "Transform photos into artistic styles with AI.\n" +
                        "**Command:** `!img2img <image_url>` or upload with `!img2img`\n" +
                        "**Styles:** Photobox, Pixel Art, Anime, Cyberpunk, and more\n" +
                        "**Feature:** Custom prompts supported",
                    inline: false
                },
                {
                    name: "YouTube Video Summarizer",
                    value:
                        "Get instant AI-generated summaries of YouTube videos.\n" +
                        "**Command:** `!ytsummary <youtube_url>`\n" +
                        "**Aliases:** `!ytsum`, `!yts`\n" +
                        "**Example:** `!yts https://youtu.be/example`",
                    inline: false
                },
                {
                    name: "Feature Request",
                    value:
                        "Have ideas? Share your suggestions with us!\n" +
                        "**Command:** `!req <your request>`\n" +
                        "**Example:** `!req Add music playlist feature`",
                    inline: false
                }
            )
            .addFields({
                name: "Need Help?",
                value: "Contact <@870115369174564914> for assistance or questions.",
                inline: false
            })
            .setFooter({ text: "akhfhid-bot • Powered by AI Technology" })
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
