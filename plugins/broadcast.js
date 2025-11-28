const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "broadcast",
    alias: ["bc"],
    description: "Broadcast announcement about text-to-speech feature to all servers (Owner Only)",
    run: async (client, message, args) => {
        if (message.author.id !== "870115369174564914") {
            return message.reply("You do not have permission to use this command.");
        }

        const embed = new EmbedBuilder()
            .setColor("#00FFFF")
            .setTitle("New Feature: AI Text-to-Speech (TTS)")
            .setDescription(
                "**Now you can convert text into realistic AI-generated voices using the `!tts` command.**\n\n" +

                "**How to Use:**\n" +
                "1. Type: `!tts <your text>`\n" +
                "2. Choose a voice from the dropdown menu\n" +
                "3. Wait for audio generation to complete\n" +
                "4. The bot will return your text as an audio file\n\n" +

                "**Available Voices:**\n" +
                "- Alloy — versatile and balanced\n" +
                "- Echo — warm and rounded\n" +
                "- Fable — British-accent, neutral tone\n" +
                "- Onyx — deep and powerful voice\n" +
                "- Nova — energetic and bright\n" +
                "- Shimmer — expressive and clear\n\n" +

                "**Example:**\n" +
                "`!tts Hello everyone, welcome to the server!`\n\n" +

                "**Now you can convert text into realistic AI-generated voices using `!tts`.**\n\n" +
                "**Need help or want to request new features?**\n" +
                "Contact <@870115369174564914> or use:\n" +
                "`!req <your request>`\n\n" +
                "Try it now and bring your messages to life with natural voice output."
            )
            .setFooter({ text: "<@870115369174564914> — owner of akhfhid-bot" })
            .setTimestamp();

        let successCount = 0;
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
                } catch (e) {
                    console.error(`Failed to send to server ${guild.name}:`, e);
                }
            }
        }

        message.reply(`Announcement successfully sent to ${successCount} servers.`);
    }
};
