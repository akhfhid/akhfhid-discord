const { EmbedBuilder } = require('discord.js');
const { generateText } = require('../utils/aiHelper');

module.exports = {
    name: "testschedule",
    description: "Test pesan jadwal harian dengan AI (Admin only)",
    alias: ["testsch"],
    permissions: "ManageGuild",
    run: async (client, message, args) => {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply("❌ Anda tidak memiliki izin `ManageGuild`!");
        }

        const loadingEmbed = new EmbedBuilder()
            .setColor('#FFCC00')
            .setTitle('🤖 Generating AI Message...')
            .setDescription('Sedang membuat pesan motivasi pagi dengan AI...')
            .setTimestamp();

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
            const now = new Date();
            const dayName = dayNames[now.getDay()];
            const dateStr = now.toLocaleDateString("id-ID");

            const systemPrompt = `Kamu adalah asisten AI yang ramah dan memotivasi. Buatkan pesan pagi yang singkat, positif, dan memotivasi dalam bahasa Indonesia. Maksimal 3-4 kalimat saja. Jangan gunakan emoji berlebihan.`;
            const text = `Buatkan pesan motivasi pagi untuk server Discord "${message.guild.name}" di hari ${dayName}, ${dateStr}.`;

            const response = await generateText(text, systemPrompt, "schedule-daily-message");

            if (response && response.result) {
                const resultEmbed = new EmbedBuilder()
                    .setColor('#00FF88')
                    .setTitle('🌅 Pesan Pagi Harian (Test)')
                    .setDescription(`Selamat pagi warga ${message.guild.name}! ☀️\nHari ${dayName}, ${dateStr}\n\n${response.result}\n\n_Dikirim otomatis setiap pukul 07:30 WIB_`)
                    .addFields(
                        { name: '⏱️ Response Time', value: response.responseTime || 'N/A', inline: true },
                        { name: '🤖 Status', value: '✅ AI Generated', inline: true }
                    )
                    .setFooter({ text: `Tested by ${message.author.tag}` })
                    .setTimestamp();

                await loadingMsg.edit({ embeds: [resultEmbed] });
            } else {
                throw new Error('No result from AI');
            }
        } catch (error) {
            console.error('Error testing schedule:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Error')
                .setDescription('Gagal generate pesan AI. Menggunakan fallback message.')
                .addFields({
                    name: 'Fallback Message',
                    value: `🌅 **Pesan Pagi Harian**\nSelamat pagi warga ${message.guild.name}! ☀️\nHari ${new Date().toLocaleDateString("id-ID", { weekday: 'long' })}, ${new Date().toLocaleDateString("id-ID")}\n\nSemoga hari ini penuh berkah dan produktif. Jangan lupa bahagia dan tetap semangat! 🎉`
                })
                .setTimestamp();

            await loadingMsg.edit({ embeds: [errorEmbed] });
        }
    }
};
