const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const akhfhid = process.env.BASE_API;
module.exports = {
    name: "ai",
    alias: ["gpt", "chat"],
    description: "Chat with Akhfhid AI",

    run: async (client, message, args) => {
        if (!args.length) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF5733')
                .setTitle('Wrong Usage!')
                .setDescription('Send a message after the command !')
                .addFields({
                    name: 'Example',
                    value: `\`${process.env.PREFIX || '!'}ai Hai introduce yourself \``
                });
            return message.reply({ embeds: [errorEmbed] });
        }

        try {
            const loadingEmbed = new EmbedBuilder()
                .setColor('#FFCC00') 
                .setAuthor({
                    name: 'Akhfhid AI',
                    iconURL: client.user.displayAvatarURL() 
                })
                .addFields(
                    { name: 'Duration', value: '0 seconds', inline: true },
                    { name: 'Status', value: `Connecting...`, inline: true }
                )
                .setFooter({ text: `Requested by ${message.author.tag}` })
                .setTimestamp();

            const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

            let seconds = 0;
            const timer = setInterval(() => {
                seconds++;
                const updated = EmbedBuilder.from(loadingEmbed)
                    .setFields(
                        { name: 'Duration', value: `${seconds} seconds`, inline: true },
                        { name: 'Status', value: `Processing Answer...`, inline: true }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Requested by ${message.author.tag}` });
                loadingMsg.edit({ embeds: [updated] }).catch(() => { });
            }, 1000);

            const text = args.join(' ');
            const data = {
                text: text,
                systemPrompt: `Kamu adalah asisten AI yang ramah dan cerdas bernama akhfhid, dibuat khusus untuk server Discord "${message.guild.name}". Sapa pengguna dengan nama mereka (${message.author.username}). Jawab dengan singkat, informatif, dan bahasa yang mudah dimengerti.`,
                sessionId: message.author.id
            };
            const response = await axios.post(`${akhfhid}/ai/gpt/5-nano`, data, {
                headers: { 'Content-Type': 'application/json' }
            });

            clearInterval(timer);
            await loadingMsg.delete();
            const resultEmbed = new EmbedBuilder()
                .setColor('#0099FF') 
                .setAuthor({
                    name: 'Akhfhid AI',
                    iconURL: client.user.displayAvatarURL() 
                })
                .setDescription(response.data.result)
                .addFields(
                    { name: '👤 Asking by', value: message.author.tag, inline: true },
                    { name: '⏱️ Response Time', value: response.data.responseTime, inline: true },
                    { name: '🌐 Server', value: message.guild.name, inline: true }
                )
                .setFooter({
                    text: `requested by ${message.author.tag} `,
                })
                .setTimestamp();
            await message.reply({ embeds: [resultEmbed] });
        } catch (error) {
            console.error('Error saat memanggil API AI:', error);

            if (timer) clearInterval(timer);
            if (loadingMsg) {
                await loadingMsg.delete().catch(() => { });
            }
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000') 
                .setTitle('❌ Terjadi Kesalahan')
                .setDescription('Maaf, saya tidak dapat memproses permintaan Anda saat ini. Silakan coba lagi beberapa saat lagi.')
                .setFooter({ text: 'Jika masalah berlanjut, hubungi administrator.' });

            await message.reply({ embeds: [errorEmbed] });
        }
    }
};