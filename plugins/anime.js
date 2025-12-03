const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
function groupEpisodes(episodes, size) {
    const groups = [];
    for (let i = 0; i < episodes.length; i += size) {
        groups.push(episodes.slice(i, i + size));
    }
    return groups;
}

module.exports = {
    name: 'anime',
    alias: ['ani', 'akhfhidnime'],
    description: 'Cari dan nonton anime dari Akhfhid Nime',

    run: async (client, message, args) => {

        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0044')
                        .setTitle(`Input Tidak Valid`)
                        .setDescription(`Masukkan judul anime!\n\nContoh: \`!anime naruto\``)
                        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                        .setTimestamp()
                ]
            });
        }

        const query = args.join(' ');
        const searchUrl = `https://www.sankavollerei.com/anime/zoronime/search/${encodeURIComponent(query)}`;

        try {
            const loadingMsg = await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle(`Sedang Mencari Anime...`)
                        .setDescription(`Query: **${query}**`)
                        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                        .setTimestamp()
                ]
            });

            const response = await axios.get(searchUrl);
            const data = response.data;

            if (!data.status || !data.animes || data.animes.length === 0) {
                return loadingMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0044')
                            .setTitle(`Anime Tidak Ditemukan`)
                            .setDescription(`Tidak ada hasil untuk: **${query}**`)
                            .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                            .setTimestamp()
                    ]
                });
            }

            const animes = data.animes.filter(a => a.episode_or_type !== 'Movie');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('anime_select')
                .setPlaceholder(`Hasil pencarian untuk ${query}...`)
                .addOptions(
                    animes.map((anime) => ({
                        label: anime.title.substring(0, 100),
                        description: `${anime.episode_or_type} | Rate ${anime.score}`,
                        value: anime.slug
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const mainEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle(`Hasil Pencarian: ${query}`)
                .setDescription(`Silakan pilih anime dari menu di bawah ini!`)
                .setThumbnail(animes[0].poster)
                .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                .setTimestamp();

            const msg = await loadingMsg.edit({ embeds: [mainEmbed], components: [row] });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 300000
            });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'anime_select') {
                    await interaction.deferUpdate();
                    const slug = interaction.values[0];
                    const selectedAnime = animes.find(a => a.slug === slug);
                    await handleAnimeDetail(interaction, slug, msg, selectedAnime, message);
                }

                if (interaction.customId === 'select_page') {
                    await interaction.deferUpdate();
                    const pageIndex = parseInt(interaction.values[0].split('_')[1]);
                    await handleEpisodePageSelection(msg, interaction, message, pageIndex);
                }

                if (interaction.customId === 'episode_select') {
                    await interaction.deferUpdate();
                    const slug = interaction.values[0];
                    await handleEpisodeDetail(interaction, slug, msg, message);
                }

                if (interaction.customId === 'back_to_search') {
                    await interaction.deferUpdate();
                    await msg.edit({ embeds: [mainEmbed], components: [row] });
                }
            });

            collector.on('end', () => {
                msg.edit({ components: [] }).catch(() => { });
            });

        } catch (error) {
            console.error(error);
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle(`Terjadi Kesalahan`)
                        .setDescription(`Gagal melakukan pencarian anime.`)
                        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                ]
            });
        }
    }
};

let global_episodeGroups = [];
let global_message = null;

async function handleAnimeDetail(interaction, slug, msg, animeSelected, message) {

    const detailUrl = `https://www.sankavollerei.com/anime/zoronime/detail/${slug}`;
    global_message = message;

    try {
        const response = await axios.get(detailUrl);
        const data = response.data;
        const detail = data.detail;

        const posterToUse = animeSelected.poster || detail.poster;

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(`${detail.title}`)
            .setThumbnail(posterToUse)
            .setDescription(
                detail.synopsis.length > 350
                    ? detail.synopsis.substring(0, 350) + '...'
                    : detail.synopsis
            )
            .addFields(
                { name: "Score", value: `${detail.info.mal_score || '-'}`, inline: true },
                { name: "Tipe", value: `${detail.info.type || '-'}`, inline: true },
                { name: "Status", value: `${detail.info.status || '-'}`, inline: true },
                {
                    name: "Genre",
                    value: detail.genres.map(g => `${g.name}`).join(', ') || '-',
                    inline: false
                },
                {
                    name: "Total Episode",
                    value: `${detail.episode_list.length}` || '-',
                    inline: false
                }
            )
            .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
            .setTimestamp();

        // GROUP EPISODES BY 25
        global_episodeGroups = groupEpisodes(detail.episode_list, 25);

        const pageOptions = global_episodeGroups.map((group, index) => ({
            label: `Episode ${index * 25 + 1} - ${index * 25 + group.length}`,
            value: `page_${index}`
        }));

        const components = [
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_page')
                    .setPlaceholder('Pilih halaman episode...')
                    .addOptions(pageOptions)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_search')
                    .setLabel('Kembali')
                    .setStyle(ButtonStyle.Secondary)
            )
        ];

        await msg.edit({ embeds: [embed], components });

    } catch (error) {
        console.error(error);
        return interaction.followUp({
            content: `Gagal memuat detail anime.`,
            ephemeral: true
        });
    }
}

async function handleEpisodePageSelection(msg, interaction, message, pageIndex) {

    const episodes = global_episodeGroups[pageIndex];

    const episodeOptions = episodes.map(ep => ({
        label: ep.name,
        value: ep.slug,
        description: ep.name
    }));

    const rowEpisode = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('episode_select')
            .setPlaceholder(`Pilih episode...`)
            .addOptions(episodeOptions)
    );

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('back_to_search')
            .setLabel('Kembali')
            .setStyle(ButtonStyle.Secondary)
    );

    await msg.edit({ components: [rowEpisode, rowBack] });
}

async function handleEpisodeDetail(interaction, slug, msg, message) {

    const episodeUrl = `https://www.sankavollerei.com/anime/zoronime/episode/${slug}`;

    try {
        const response = await axios.get(episodeUrl);
        const data = response.data;

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(`${data.episode_title}`)
            .addFields(
                {
                    name: "Streaming",
                    value: data.streams.map(s => `[${s.name}](${s.url})`).join('\n') || '-'
                },
                {
                    name: "Download",
                    value: data.downloads.map(d => `[${d.name}](${d.url})`).join('\n') || '-'
                },
            )
            .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
            .setTimestamp();

        const backButton = new ButtonBuilder()
            .setCustomId('back_to_search')
            .setLabel('Kembali')
            .setStyle(ButtonStyle.Secondary);

        await msg.edit({ embeds: [embed], components: [new ActionRowBuilder().addComponents(backButton)] });

    } catch (error) {
        console.error(error);
        return interaction.followUp({ content: `Gagal memuat episode.`, ephemeral: true });
    }
}
