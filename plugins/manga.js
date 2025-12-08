const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const PDFDocument = require('pdfkit');

function groupChapters(chapters, size) {
    const groups = [];
    for (let i = 0; i < chapters.length; i += size) {
        groups.push(chapters.slice(i, i + size));
    }
    return groups;
}

let global_chapterGroups = [];
let global_manga_message = null;
let global_chapter_images = [];
let global_current_image_index = 0;
let global_current_chapter_slug = '';

module.exports = {
    name: 'manga',
    alias: ['komik', 'manhwa', 'manhua'],
    description: 'Cari dan baca manga/manhwa/manhua dari Komikindo',

    run: async (client, message, args) => {
        if (!args.length) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0044')
                        .setTitle(`Input Tidak Valid`)
                        .setDescription(`Masukkan judul manga!\n\nContoh: \`!manga one piece\``)
                        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                        .setTimestamp()
                ]
            });
        }

        const query = args.join(' ');
        const searchUrl = `https://www.sankavollerei.com/comic/komikindo/search/${encodeURIComponent(query)}/1`;

        try {
            const loadingMsg = await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle(`Sedang Mencari Manga...`)
                        .setDescription(`Query: **${query}**`)
                        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                        .setTimestamp()
                ]
            });

            const response = await axios.get(searchUrl);
            const data = response.data;

            if (!data.success || !data.komikList || data.komikList.length === 0) {
                return loadingMsg.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF0044')
                            .setTitle(`Manga Tidak Ditemukan`)
                            .setDescription(`Tidak ada hasil untuk: **${query}**`)
                            .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                            .setTimestamp()
                    ]
                });
            }

            const mangas = data.komikList.slice(0, 25);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('manga_select')
                .setPlaceholder(`Hasil pencarian untuk ${query}...`)
                .addOptions(
                    mangas.map((manga) => ({
                        label: manga.title.substring(0, 100),
                        description: `${manga.type} | Rating ${manga.rating}`,
                        value: manga.slug
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const mainEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle(`Hasil Pencarian: ${query}`)
                .setDescription(`Silakan pilih manga dari menu di bawah ini!`)
                .setThumbnail(mangas[0].image)
                .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                .setTimestamp();

            const msg = await loadingMsg.edit({ embeds: [mainEmbed], components: [row] });

            const collector = msg.createMessageComponentCollector({
                filter: i => i.user.id === message.author.id,
                time: 600000 // 10 minutes
            });

            collector.on('collect', async interaction => {
                try {
                    if (interaction.customId === 'manga_select') {
                        await interaction.deferUpdate();
                        const slug = interaction.values[0];
                        const selectedManga = mangas.find(m => m.slug === slug);
                        await handleMangaDetail(interaction, slug, msg, selectedManga, message);
                    }

                    if (interaction.customId === 'select_chapter_page') {
                        await interaction.deferUpdate();
                        const pageIndex = parseInt(interaction.values[0].split('_')[1]);
                        await handleChapterPageSelection(msg, interaction, message, pageIndex);
                    }

                    if (interaction.customId === 'chapter_select') {
                        await interaction.deferUpdate();
                        const slug = interaction.values[0];
                        await handleChapterDetail(interaction, slug, msg, message);
                    }

                    if (interaction.customId === 'back_to_search_manga') {
                        await interaction.deferUpdate();
                        await msg.edit({ embeds: [mainEmbed], components: [row] });
                    }

                    if (interaction.customId.startsWith('read_page_')) {
                        await interaction.deferUpdate();
                        const action = interaction.customId.split('_')[2];
                        if (action === 'next') {
                            if (global_current_image_index < global_chapter_images.length - 1) {
                                global_current_image_index++;
                                await updateReader(msg, message);
                            }
                        } else if (action === 'prev') {
                            if (global_current_image_index > 0) {
                                global_current_image_index--;
                                await updateReader(msg, message);
                            }
                        }
                    }

                    if (interaction.customId === 'download_pdf') {
                        await interaction.deferUpdate();
                        await handlePDFDownload(interaction, msg, message);
                    }

                    if (interaction.customId === 'back_to_chapter_list') {
                        await interaction.deferUpdate();
                        await msg.edit({ embeds: [mainEmbed], components: [row] });
                    }
                } catch (e) {
                    console.error("Collector Error:", e);
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
                        .setDescription(`Gagal melakukan pencarian manga.`)
                        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
                ]
            });
        }
    }
};

async function handleMangaDetail(interaction, slug, msg, mangaSelected, message) {
    const detailUrl = `https://www.sankavollerei.com/comic/komikindo/detail/${slug}`;
    global_manga_message = message;

    try {
        const response = await axios.get(detailUrl);
        const data = response.data;
        const detail = data.data;

        const posterToUse = mangaSelected.image || detail.image;

        // Fix genres: handle if it's array of strings or objects
        let genresDisplay = '-';
        if (detail.genres && Array.isArray(detail.genres)) {
            if (typeof detail.genres[0] === 'string') {
                genresDisplay = detail.genres.join(', ');
            } else if (typeof detail.genres[0] === 'object') {
                genresDisplay = detail.genres.map(g => g.name).join(', ');
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF88')
            .setTitle(`${detail.title}`)
            .setThumbnail(posterToUse)
            .setDescription(
                detail.description.length > 350
                    ? detail.description.substring(0, 350) + '...'
                    : detail.description
            )
            .addFields(
                { name: "Rating", value: `${detail.rating || '-'}`, inline: true },
                { name: "Tipe", value: `${detail.detail.type || '-'}`, inline: true },
                { name: "Status", value: `${detail.detail.status || '-'}`, inline: true },
                { name: "Author", value: `${detail.detail.author || '-'}`, inline: true },
                {
                    name: "Genre",
                    value: genresDisplay,
                    inline: false
                }
            )
            .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
            .setTimestamp();

        // GROUP CHAPTERS BY 25
        global_chapterGroups = groupChapters(detail.chapters, 25);

        const pageOptions = global_chapterGroups.map((group, index) => ({
            label: `Chapter ${index * 25 + 1} - ${index * 25 + group.length}`,
            value: `page_${index}`
        }));

        const components = [];

        if (pageOptions.length > 0) {
            components.push(
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_chapter_page')
                        .setPlaceholder('Pilih halaman chapter...')
                        .addOptions(pageOptions)
                )
            );
        }

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('back_to_search_manga')
                    .setLabel('Kembali')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        await msg.edit({ embeds: [embed], components });

    } catch (error) {
        console.error(error);
        return interaction.followUp({
            content: `Gagal memuat detail manga.`,
            ephemeral: true
        });
    }
}

async function handleChapterPageSelection(msg, interaction, message, pageIndex) {
    const chapters = global_chapterGroups[pageIndex];

    const chapterOptions = chapters.map(ch => ({
        label: ch.title,
        value: ch.slug,
        description: ch.r || 'No date'
    }));

    const rowChapter = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('chapter_select')
            .setPlaceholder(`Pilih chapter...`)
            .addOptions(chapterOptions)
    );

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('back_to_search_manga')
            .setLabel('Kembali')
            .setStyle(ButtonStyle.Secondary)
    );

    await msg.edit({ components: [rowChapter, rowBack] });
}

async function handleChapterDetail(interaction, slug, msg, message) {
    const chapterUrl = `https://www.sankavollerei.com/comic/komikindo/chapter/${slug}`;
    global_current_chapter_slug = slug;

    try {
        const response = await axios.get(chapterUrl);
        const data = response.data;

        if (!data.success) {
            return interaction.followUp({ content: 'Gagal mengambil detail chapter.', ephemeral: true });
        }

        // Parse images
        // API returns data.data.images as array of objects {id, url}
        // Ensure we handle if data.data.images is undefined
        if (!data.data || !data.data.images) {
            return interaction.followUp({ content: 'Tidak ada gambar di chapter ini.', ephemeral: true });
        }

        global_chapter_images = data.data.images.map(img => img.url);
        global_current_image_index = 0;

        if (global_chapter_images.length === 0) {
            return interaction.followUp({ content: 'Tidak ada gambar di chapter ini.', ephemeral: true });
        }

        await updateReader(msg, message, data.data.title);

    } catch (error) {
        console.error(error);
        return interaction.followUp({ content: `Gagal memuat chapter.`, ephemeral: true });
    }
}

async function updateReader(msg, message, titleOverride = null) {
    const imageUrl = global_chapter_images[global_current_image_index];
    const totalImages = global_chapter_images.length;

    const title = titleOverride || `Manga Reader`;

    const embed = new EmbedBuilder()
        .setColor('#00FF88')
        .setTitle(title)
        .setDescription(`Halaman ${global_current_image_index + 1} dari ${totalImages}`)
        .setImage(imageUrl)
        .setFooter({ text: `Requested by ${message.author.tag} | Powered by Akhfhid Nime` })
        .setTimestamp();

    const row = new ActionRowBuilder();

    const prevButton = new ButtonBuilder()
        .setCustomId('read_page_prev')
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(global_current_image_index === 0);

    const nextButton = new ButtonBuilder()
        .setCustomId('read_page_next')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(global_current_image_index === totalImages - 1);

    const pdfButton = new ButtonBuilder()
        .setCustomId('download_pdf')
        .setLabel('📄 PDF')
        .setStyle(ButtonStyle.Success);

    const backButton = new ButtonBuilder()
        .setCustomId('back_to_chapter_list')
        .setLabel('Tutup')
        .setStyle(ButtonStyle.Danger);

    row.addComponents(prevButton, nextButton, pdfButton, backButton);

    await msg.edit({ embeds: [embed], components: [row] });
}

async function handlePDFDownload(interaction, msg, message) {
    const loadingEmbed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setDescription('⏳ Sedang membuat PDF... Mohon tunggu sebentar (bisa memakan waktu beberapa menit).');

    await interaction.followUp({ embeds: [loadingEmbed], ephemeral: true });

    try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));

        // Download all images
        for (const url of global_chapter_images) {
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                const img = response.data;

                const image = doc.openImage(img);
                doc.addPage({ size: [image.width, image.height] });
                doc.image(image, 0, 0);
            } catch (err) {
                console.error(`Failed to download image ${url}:`, err);
                // Continue to next image
            }
        }

        doc.end();

        // Wait for PDF to finish
        await new Promise(resolve => doc.on('end', resolve));

        const pdfData = Buffer.concat(buffers);

        if (pdfData.length > 25 * 1024 * 1024) { // 25MB limit
            return interaction.editReply({
                content: '❌ Ukuran PDF melebihi batas upload Discord (25MB). Silakan baca menggunakan reader di atas.',
                embeds: []
            });
        }

        const attachment = new AttachmentBuilder(pdfData, { name: `${global_current_chapter_slug || 'chapter'}.pdf` });

        await interaction.editReply({
            content: '✅ PDF berhasil dibuat!',
            embeds: [],
            files: [attachment]
        });

    } catch (error) {
        console.error("PDF Generation Error:", error);
        await interaction.editReply({
            content: '❌ Terjadi kesalahan saat membuat PDF.',
            embeds: []
        });
    }
}
