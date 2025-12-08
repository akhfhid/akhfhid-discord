const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "ping",
    alias: ["p", "latency"],
    description: "Check respond speed bot",

    run: async (client, message, args) => {
        const msg = await message.reply("Count ping...");

        const latency = msg.createdTimestamp - message.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);

        const embed = new EmbedBuilder()
            .setColor("#4CAF50")
            .setTitle("Pong!")
            .addFields(
                { name: "Bot Latency", value: `\`${latency}ms\``, inline: true },
                { name: "API Latency", value: `\`${apiPing}ms\``, inline: true },
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}` });

        msg.edit({
            content: "",
            embeds: [embed]
        });
    }
};
