const { EmbedBuilder } = require('discord.js');
const { generateText } = require('../utils/aiHelper');

// Cooldown map (5 minutes)
const cooldowns = new Map();

function checkCooldown(userId) {
    const lastTime = cooldowns.get(userId);
    if (!lastTime) return true;

    const now = Date.now();
    const cooldown = 5 * 60 * 1000; // 5 minutes

    return (now - lastTime) >= cooldown;
}

function setCooldown(userId) {
    cooldowns.set(userId, Date.now());
}

function getVibeColor(score) {
    if (score >= 80) return '#2ECC71'; // Green - Positive
    if (score >= 60) return '#3498DB'; // Blue - Chill
    if (score >= 40) return '#F1C40F'; // Yellow - Mixed
    if (score >= 20) return '#E67E22'; // Orange - Chaotic
    return '#E74C3C'; // Red - Toxic
}

function getVibeEmoji(score) {
    if (score >= 80) return '😊';
    if (score >= 60) return '😎';
    if (score >= 40) return '😐';
    if (score >= 20) return '😬';
    return '😤';
}

function getVibeLabel(score) {
    if (score >= 80) return 'Positive Vibes ✨';
    if (score >= 60) return 'Chill Vibes 🌊';
    if (score >= 40) return 'Mixed Vibes 🎭';
    if (score >= 20) return 'Chaotic Vibes 🌪️';
    return 'Toxic Vibes ⚠️';
}

module.exports = {
    name: "vibecheck",
    description: "Check vibe kamu atau orang lain 😎",
    alias: ["vibe", "vc"],

    run: async (client, message, args) => {
        // Check cooldown
        if (!checkCooldown(message.author.id)) {
            const lastTime = cooldowns.get(message.author.id);
            const timeLeft = 5 * 60 * 1000 - (Date.now() - lastTime);
            const minutesLeft = Math.floor(timeLeft / 60000);
            const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('⏰ Cooldown Active')
                .setDescription(`Tunggu sebentar sebelum vibe check lagi!\n\nCoba lagi dalam: **${minutesLeft}m ${secondsLeft}s**`)
                .setFooter({ text: 'Cooldown: 5 menit' });

            return message.reply({ embeds: [embed] });
        }

        // Determine target
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

        // Loading message
        const loadingEmbed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🔍 Analyzing Vibes...')
            .setDescription(`*Scanning energy dari ${targetName}...*`)
            .setTimestamp();

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            let messages = [];
            let chatContext = '';

            if (targetType === 'channel') {
                // Fetch channel messages
                const fetchedMessages = await target.messages.fetch({ limit: 100 });
                messages = [...fetchedMessages.values()]
                    .filter(m => !m.author.bot && m.content.length > 0)
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .slice(-50); // Last 50 messages

                chatContext = messages.map(m =>
                    `${m.author.username}: ${m.content.substring(0, 100)}`
                ).join('\n');

            } else {
                // Fetch user messages from current channel
                const fetchedMessages = await message.channel.messages.fetch({ limit: 100 });
                messages = [...fetchedMessages.values()]
                    .filter(m => m.author.id === target.id && m.content.length > 0)
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .slice(-50); // Last 50 messages

                chatContext = messages.map(m =>
                    m.content.substring(0, 100)
                ).join('\n');
            }

            if (messages.length < 5) {
                const embed = new EmbedBuilder()
                    .setColor('#E67E22')
                    .setTitle('❌ Not Enough Data')
                    .setDescription(`Tidak cukup pesan untuk analyze vibe ${targetName}.\n\nMinimal 5 pesan diperlukan.`)
                    .setTimestamp();

                return await loadingMsg.edit({ embeds: [embed] });
            }

            // Generate vibe analysis with AI
            const systemPrompt = `Kamu adalah AI analyzer yang witty dan lucu. Analyze chat messages dan berikan personality report yang entertaining tapi tetap insightful. Gunakan humor dan bahasa Indonesia yang casual. Berikan:
1. Vibe score (0-100) di awal dengan format "VIBE_SCORE: [angka]"
2. Analisis personality yang fun (3-4 kalimat)
3. Breakdown singkat: mood, energy level, humor level
4. Fun fact atau observation yang lucu

Jangan terlalu serius, bikin yang fun dan relatable!`;

            const targetDesc = targetType === 'channel'
                ? `channel #${targetName}`
                : `user ${targetName}`;

            const text = `Analyze vibe dari ${targetDesc} berdasarkan pesan-pesan ini:\n\n${chatContext.substring(0, 2000)}`;

            const response = await generateText(text, systemPrompt, `vibecheck-${message.author.id}`);

            if (response && response.result) {
                // Set cooldown
                setCooldown(message.author.id);

                // Extract vibe score from response
                const scoreMatch = response.result.match(/VIBE_SCORE:\s*(\d+)/i);
                const vibeScore = scoreMatch ? parseInt(scoreMatch[1]) : Math.floor(Math.random() * 40) + 50; // Default 50-90

                // Remove score from result text
                const analysisText = response.result.replace(/VIBE_SCORE:\s*\d+/i, '').trim();

                const vibeEmbed = new EmbedBuilder()
                    .setColor(getVibeColor(vibeScore))
                    .setAuthor({
                        name: '😎 Vibe Check Results',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTitle(`Vibe Analysis: ${targetName}`)
                    .setDescription(analysisText)
                    .addFields(
                        {
                            name: '📊 Vibe Score',
                            value: `**${vibeScore}/100** ${getVibeEmoji(vibeScore)}\n${getVibeLabel(vibeScore)}`,
                            inline: true
                        },
                        {
                            name: '📈 Messages Analyzed',
                            value: `${messages.length} pesan`,
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
            console.error('Vibe check error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('❌ Vibe Check Failed')
                .setDescription('Gagal analyze vibe. Energi lagi kacau nih. Coba lagi nanti!')
                .setTimestamp();

            await loadingMsg.edit({ embeds: [errorEmbed] });
        }
    }
};
