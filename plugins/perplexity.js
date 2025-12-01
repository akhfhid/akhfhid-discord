const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const akhfhid = process.env.BASE_API;
module.exports = {
    name: "perplexity",
    alias: ["plex", "ai-plex"],
    description: "Search information with Perplexity AI",

    run: async (client, message, args) => {
        const query = args.join(" ");
        if (!query) return message.reply("Insert Topic !");

        let seconds = 0;
        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('🧠 Perplexity AI')
            .setDescription(`Searching information about:\n**${query}**`)
            .setTimestamp()
            .addFields(
                { name: '⏱️ Duration', value: `0 Sec`, inline: true },
                { name: '📊 Status', value: `Connecting to API...`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const loadingMsg = await message.channel.send({ embeds: [loadingEmbed] });

        const timer = setInterval(() => {
            seconds++;
            const updated = EmbedBuilder.from(loadingEmbed)
                .setFields(
                    { name: '⏱️ Duration', value: `${seconds} Sec`, inline: true },
                    { name: '📊 Status', value: `Processing data...`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: `Requested by ${message.author.tag}` });
            loadingMsg.edit({ embeds: [updated] }).catch(() => { });
        }, 1000);

        try {
            const res = await axios.get(
                `${akhfhid}/text-generation/perplexity?query=${encodeURIComponent(query)}&web=true&academic=true&social=true&finance=true`
            );

            clearInterval(timer);
            loadingMsg.delete().catch(() => { });

            const data = res.data;
            if (!data.success) {
                return message.channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setTitle("❌ Perplexity Error")
                            .setDescription(data.message || "Gagal mengambil data")
                    ]
                });
            }

            const result = data.result;

            const mainEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle(`🧠 Perplexity: ${result.query}`)
                .setDescription(result.response.answer.substring(0, 1800))
                .addFields(
                    { name: "🔍 Related", value: result.related_queries.slice(0, 3).join("\n• ") || "-" },
                    { name: "⏱️ Duration", value: `${seconds} Sec`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Requested by ' + `${message.author.tag}` + `ID: ${result.id}` || 'User' });

            await message.channel.send({ embeds: [mainEmbed] });
            const sources = result.response.search_results;
            if (sources.length === 0) return;

            let page = 0;
            const perPage = 5;
            const totalPage = Math.ceil(sources.length / perPage);

            const getPageEmbed = (pageIndex) => {
                const start = pageIndex * perPage;
                const paginated = sources.slice(start, start + perPage);

                return new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle(` Sources Journal (Page ${pageIndex + 1}/${totalPage})`)
                    .setDescription(
                        paginated.map((s, i) => {
                            return `**${start + i + 1}. ${s.name}**\n${s.snippet ? `> ${s.snippet}\n` : ""
                                }[Open Link](${s.url})`;
                        }).join("\n\n")
                    )
                    .setFooter({ text: 'Requested by ' + `${message.author.tag}` || 'User' })
                    .setTimestamp();
            };

            const getButtons = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("prev_source")
                        .setEmoji("⬅️")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),

                    new ButtonBuilder()
                        .setCustomId("next_source")
                        .setEmoji("➡️")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPage - 1),

                    new ButtonBuilder()
                        .setCustomId("delete_source")
                        .setEmoji("🗑️")
                        .setStyle(ButtonStyle.Danger)
                );
            };

            const sourceMsg = await message.channel.send({
                embeds: [getPageEmbed(page)],
                components: [getButtons()]
            });

            const collector = sourceMsg.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'prev_source') {
                    page = Math.max(0, page - 1);
                    await interaction.update({
                        embeds: [getPageEmbed(page)],
                        components: [getButtons()]
                    });
                } else if (interaction.customId === 'next_source') {
                    page = Math.min(totalPage - 1, page + 1);
                    await interaction.update({
                        embeds: [getPageEmbed(page)],
                        components: [getButtons()]
                    });
                } else if (interaction.customId === 'delete_source') {
                    await interaction.message.delete();
                    collector.stop();
                }
            });

            collector.on('end', () => {
                if (sourceMsg.editable) {
                    sourceMsg.edit({ components: [] }).catch(() => { });
                }
            });

        } catch (err) {
            clearInterval(timer);
            loadingMsg.delete().catch(() => { });
            console.error(err);

            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("API Error")
                        .setDescription("An error occurred while connecting to the API, try again later.")
                ]
            });
        }
    }
};