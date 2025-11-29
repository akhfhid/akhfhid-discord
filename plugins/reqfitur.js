module.exports = {
    name: "reqfitur",
    alias: ["req"],
    description: "Send feature request to dedicated channel",
    run: async (client, message, args) => {

        const requestChannelId = "1442096482244104314";

        const requestText = args.join(" ");
        if (!requestText)
            return message.reply("Please write the feature you want to request.\nExample: `!reqfitur please add music pause feature`");

        const channel = message.client.channels.cache.get(requestChannelId);
        if (!channel)
            return message.reply("Feature request channel not found.");

        const embed = {
            title: "Feature Request",
            description: `**Request Details:**\n${requestText}`,
            color: 0x00AEFF,
            fields: [
                {
                    name: "Requested By",
                    value: `${message.author.tag}\nID: ${message.author.id}`,
                    inline: true
                },
                {
                    name: "Server",
                    value: `${message.guild.name}\nID: ${message.guild.id}`,
                    inline: true
                },
                {
                    name: "Timestamp",
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: false
                }
            ],
            footer: {
                text: `Request from ${message.guild.name}`
            },
            timestamp: new Date()
        };

        await channel.send({ embeds: [embed] });

        message.reply("Feature request successfully sent to Developer.");
    }
};
