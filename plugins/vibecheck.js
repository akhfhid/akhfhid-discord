const { EmbedBuilder } = require('discord.js');
const { generateText } = require('../utils/aiHelper');

const cooldowns = new Map();

function checkCooldown(userId) {
    const lastTime = cooldowns.get(userId);
    if (!lastTime) return true;

    const now = Date.now();
    const cooldown = 5 * 60 * 1000;

    return (now - lastTime) >= cooldown;
}

function setCooldown(userId) {
    cooldowns.set(userId, Date.now());
}

function getVibeColor(score) {
    if (score >= 80) return '#2ECC71';
    if (score >= 60) return '#3498DB';
    if (score >= 40) return '#F1C40F';
    if (score >= 20) return '#E67E22';
    return '#E74C3C';
}

function getVibeLabel(score) {
    if (score >= 80) return 'Vibes Positif';
    if (score >= 60) return 'Vibes Santai';
    if (score >= 40) return 'Vibes Campur';
    if (score >= 20) return 'Vibes Kacau';
    return 'Vibes Toxic';
}

module.exports = {
    name: "vibecheck",
    description: "Check your vibe or others 😎",
    alias: ["vibe", "vc"],

    run: async (client, message, args) => {
        const mentionedUser = message.mentions.users.first();
        const mentionedChannel = message.mentions.channels.first();

        let targetType = 'self';
        let target = message.author;
        let targetName = message.author.username;

        if (mentionedChannel) {
            targetType = 'channel';
            target = mentionedChannel;
            targetName = mentionedChannel.name;
        } else if (mentionedUser) {
            targetType = 'user';
            target = mentionedUser;
            targetName = mentionedUser.username;
        }

        let seconds = 0;
        const loadingEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('Vibe Check')
            .setDescription(`Analyzing vibes from:\n**${targetName}**`)
            .setTimestamp()
            .addFields(
                { name: 'Duration', value: `0 Sec`, inline: true },
                { name: 'Status', value: `Scanning energy...`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        const timer = setInterval(() => {
            seconds++;
            const updated = EmbedBuilder.from(loadingEmbed)
                .setFields(
                    { name: 'Duration', value: `${seconds} Sec`, inline: true },
                    { name: 'Status', value: `Analyzing personality...`, inline: true }
                )
                .setFooter({ text: `Requested by ${message.author.tag}` });
            loadingMsg.edit({ embeds: [updated] }).catch(() => { });
        }, 1000);

        try {
            let messages = [];
            let chatContext = '';

            if (targetType === 'channel') {
                const fetchedMessages = await target.messages.fetch({ limit: 100 });
                messages = [...fetchedMessages.values()]
                    .filter(m => !m.author.bot && m.content.length > 0)
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .slice(-50);

                chatContext = messages.map(m =>
                    `${m.author.username}: ${m.content.substring(0, 100)}`
                ).join('\n');

            } else {
                const fetchedMessages = await message.channel.messages.fetch({ limit: 100 });
                messages = [...fetchedMessages.values()]
                    .filter(m => m.author.id === target.id && m.content.length > 0)
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .slice(-50);

                chatContext = messages.map(m =>
                    m.content.substring(0, 100)
                ).join('\n');
            }

            if (messages.length < 5) {
                clearInterval(timer);

                const embed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setTitle('Data Tidak Cukup')
                    .setDescription(`Tidak cukup pesan untuk menganalisis vibe dari ${targetName}.\n\nMinimal 5 pesan diperlukan.`)
                    .setTimestamp();

                return await loadingMsg.edit({ embeds: [embed] });
            }

            const systemPrompt = `Kamu adalah AI analyzer yang witty dan lucu. Analyze chat messages dan berikan personality report yang entertaining tapi tetap insightful. Gunakan humor dan bahasa Indonesia yang casual dan natural. Berikan:
1. Vibe score (0-100) di awal dengan format "VIBE_SCORE: [angka]"
2. Analisis personality yang fun (3-4 kalimat)
3. Breakdown singkat: mood, energy level, humor level
4. Fun fact atau observasi yang lucu

Jangan terlalu serius, bikin yang fun dan relatable! JANGAN gunakan emoji sama sekali.`;

            const targetDesc = targetType === 'channel'
                ? `channel #${targetName}`
                : `user ${targetName}`;

            const text = `Analyze the vibe from ${targetDesc} based on these messages:\n\n${chatContext.substring(0, 2000)}`;

            const response = await generateText(text, systemPrompt, `vibecheck-${message.author.id}`);

            clearInterval(timer);

            if (response && response.result) {
                const scoreMatch = response.result.match(/VIBE_SCORE:\s*(\d+)/i);
                const vibeScore = scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(Math.random() * 40) + 50;

                const analysisText = response.result.replace(/VIBE_SCORE:\s*\d+/i, '').trim();

                const vibeEmbed = new EmbedBuilder()
                    .setColor(getVibeColor(vibeScore))
                    .setAuthor({
                        name: 'Vibe Check Results',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTitle(`Analisis Vibe: ${targetName}`)
                    .setDescription(analysisText)
                    .addFields(
                        {
                            name: 'Vibe Score',
                            value: `${vibeScore}/100\n${getVibeLabel(vibeScore)}`,
                            inline: true
                        },
                        {
                            name: 'Pesan Dianalisis',
                            value: `${messages.length} pesan`,
                            inline: true
                        },
                        {
                            name: 'Response Time',
                            value: `${seconds} Sec`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `Requested by ${message.author.username}` })
                    .setTimestamp();

                if (targetType !== 'self') {
                    vibeEmbed.setThumbnail(target.displayAvatarURL?.() || null);
                } else {
                    vibeEmbed.setThumbnail(message.author.displayAvatarURL());
                }

                await loadingMsg.edit({ embeds: [vibeEmbed] });
            } else {
                throw new Error('No result from AI');
            }

        } catch (error) {
            clearInterval(timer);
            console.error('Vibe check error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('Vibe Check Gagal')
                .setDescription('Gagal menganalisis vibe. Energi lagi kacau nih. Coba lagi nanti!')
                .setTimestamp();

            await loadingMsg.edit({ embeds: [errorEmbed] });
        }
    }
};
