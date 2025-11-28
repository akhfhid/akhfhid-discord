const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const akhfhid = process.env.BASE_API;
module.exports = {
    name: "airesearch",
    description: "Melakukan riset mendalam menggunakan AI",
    alias: ["ai", "research"],
    run: async (client, message, args) => {
        const query = args.join(' ');
        if (!query) {
            return message.reply("Silakan masukkan topik yang ingin diteliti!");
        }
        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle('🔍 AI Research Sedang Berjalan')
            .setDescription(`Mencari informasi tentang: **${query}**`)
            .addFields(
                { name: '⏱️ Waktu Pencarian', value: '0 detik', inline: true },
                { name: '📊 Status', value: 'Menghubungi API...', inline: true }
            )
            .setTimestamp();

        const loadingMessage = await message.channel.send({ embeds: [loadingEmbed] });

        let seconds = 0;
        const timer = setInterval(() => {
            seconds++;
            const updatedEmbed = new EmbedBuilder()
                .setColor('#FFFF00')
                .setTitle('🔍 AI Research Sedang Berjalan')
                .setDescription(`Mencari informasi tentang: **${query}**`)
                .addFields(
                    { name: '⏱️ Waktu Pencarian', value: `${seconds} detik`, inline: true },
                    { name: '📊 Status', value: 'Menganalisis data...', inline: true }
                )
                .setTimestamp();

            loadingMessage.edit({ embeds: [updatedEmbed] }).catch(console.error);
        }, 1000);

        try {
            const response = await axios.get(`${akhfhid}/text-generation/ai-research?text=${encodeURIComponent(query)}`);
            const data = response.data;
            clearInterval(timer);
            loadingMessage.delete().catch(console.error);

            if (!data.success) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Error Riset AI')
                    .setDescription(`API mengembalikan error: ${data.message || 'Error tidak diketahui'}`)
                    .addFields(
                        { name: '🔍 Query', value: query, inline: true },
                        { name: '⏱️ Waktu', value: `${seconds} detik`, inline: true }
                    )
                    .setTimestamp();

                return message.channel.send({ embeds: [errorEmbed] });
            }

            const { result } = data;

            const resultEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle(`📊 Hasil Riset: ${result.query}`)
                .setDescription(result.report.substring(0, 2048) + '...')
                .addFields(
                    { name: '🔍 Subqueries', value: result.subqueries.slice(0, 3).join('\n• ') || 'Tidak ada subqueries' },
                    { name: '📄 Sumber', value: `${result.source_urls.length} sumber ditemukan` },
                    { name: '🖼️ Gambar', value: `${result.selected_images.length} gambar ditemukan` },
                    { name: '⏱️ Waktu Pencarian', value: `${seconds} detik` },
                    { name: '💰 Biaya', value: `$${result.metadata.total_cost}` }
                )
                .setFooter({ text: `Dianalisis oleh ${result.metadata.agent_type}` })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`view_sources_${message.id}`)
                        .setLabel('📄 Lihat Sumber')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`view_images_${message.id}`)
                        .setLabel('🖼️ Lihat Gambar')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`download_files_${message.id}`)
                        .setLabel('📥 Unduh File')
                        .setStyle(ButtonStyle.Secondary)
                );

            const resultMessage = await message.channel.send({ embeds: [resultEmbed], components: [row] });

            client.researchData = client.researchData || new Map();
            client.researchData.set(message.id, {
                result,
                authorId: message.author.id
            });

        } catch (error) {
            clearInterval(timer);
            loadingMessage.delete().catch(console.error);
            console.error(error);
            let errorMessage = 'Terjadi kesalahan saat melakukan riset!';
            if (error.response) {
                if (error.response.status === 400) {
                    errorMessage = 'Parameter tidak valid. Coba dengan query yang lebih spesifik.';
                } else if (error.response.status === 429) {
                    errorMessage = 'Terlalu banyak permintaan. Silakan coba lagi nanti.';
                } else if (error.response.status >= 500) {
                    errorMessage = 'Server API sedang bermasalah. Silakan coba lagi nanti.';
                }
            } else if (error.request) {
                errorMessage = 'Tidak dapat terhubung ke API. Periksa koneksi internet Anda.';
            }

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error Riset AI')
                .setDescription(errorMessage)
                .addFields(
                    { name: '🔍 Query', value: query, inline: true },
                    { name: '⏱️ Waktu', value: `${seconds} detik`, inline: true }
                )
                .setTimestamp();

            message.channel.send({ embeds: [errorEmbed] });
        }
    }
};

