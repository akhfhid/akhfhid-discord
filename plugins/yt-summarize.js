const axios = require('axios');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "ytsummary",
    alias: ["ytsum", "yts"],
    description: "Summarize YouTube video content",

    run: async (client, message, args) => {
        const url = args[0];
        if (!url || !url.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
            return message.reply("Please provide a valid YouTube URL! Example: `!ytsummary https://youtu.be/...`");
        }

        let seconds = 0;
        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('YouTube Summarizer')
            .setDescription(`Analyzing video content...\n**${url}**`)
            .setTimestamp()
            .addFields(
                { name: '⏱️ Duration', value: `0 Sec`, inline: true },
                { name: '📊 Status', value: `Connecting to API...`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const loadingMsg = await message.channel.send({ embeds: [loadingEmbed] });

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
            const apiUrl = `${process.env.BASE_API}/tools/yt-summarizer/v2?url=${encodeURIComponent(url)}&language=en`;
            const res = await axios.get(apiUrl);

            clearInterval(timer);
            loadingMsg.delete().catch(() => { });

            const data = res.data;
            if (!data.success) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setTitle("❌ Summary Failed")
                            .setDescription(data.message || "Failed to fetch summary. Please try again later.")
                    ]
                });
            }

            const result = data.result;

            const summaryEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`Video Summary`)
                .setDescription(result.content.substring(0, 4000)) // Discord limit check
                .addFields(
                    { name: '⏱️ Process Time', value: `${seconds} Sec`, inline: true },
                    { name: '🎥 Video Duration', value: `${Math.floor(result.video_duration / 60)}m ${result.video_duration % 60}s`, inline: true }
                )
                .setThumbnail(result.video_thumbnail_url)
                .setURL(url)
                .setFooter({ text: `Requested by ${message.author.tag}` })
                .setTimestamp();

            await message.channel.send({ embeds: [summaryEmbed] });

        } catch (err) {
            clearInterval(timer);
            loadingMsg.delete().catch(() => { });
            console.error(err);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("API Error")
                        .setDescription("An error occurred while connecting to the API. Please try again later.")
                ]
            });
        }
    }
};
