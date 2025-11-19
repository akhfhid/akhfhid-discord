module.exports = {
    name: "reqfitur",
    description: "Mengirim request fitur ke channel khusus",
    run: async (client, message, args) => {

        const requestChannelId = "1439728878217072782";

        const requestText = args.join(" ");
        if (!requestText)
            return message.reply("Tulis fitur yang mau direquest ya.\nContoh: `!reqfitur tolong tambahin music pause`");

        const channel = message.client.channels.cache.get(requestChannelId);
        if (!channel)
            return message.reply("Channel request fitur tidak ditemukan..");

        const embed = {
            title: "Request Fitur",
            description: requestText,
            color: 0x00AEFF,
            fields: [
                {
                    name: "Dari User",
                    value: `${message.author.tag} (${message.author.id})`
                },
                {
                    name: "Diajukan Pada",
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`
                }
            ]
        };

        await channel.send({ embeds: [embed] });

        message.reply("Request fitur sudah dikirim ke Developer.");
    }
};
