const { EmbedBuilder } = require('discord.js');
const { generateText } = require('../utils/aiHelper');
const fs = require('fs');
const path = require('path');

const tarotPath = path.join(__dirname, '../data/tarotCards.json');
const fortuneHistoryPath = path.join(__dirname, '../data/fortuneHistory.json');

// Load tarot cards
let tarotData = {};
if (fs.existsSync(tarotPath)) {
    tarotData = JSON.parse(fs.readFileSync(tarotPath, 'utf8'));
}

// Load fortune history
let fortuneHistory = {};
if (fs.existsSync(fortuneHistoryPath)) {
    fortuneHistory = JSON.parse(fs.readFileSync(fortuneHistoryPath, 'utf8'));
}

function saveFortuneHistory() {
    fs.writeFileSync(fortuneHistoryPath, JSON.stringify(fortuneHistory, null, 2));
}

function checkCooldown(userId, category) {
    if (!fortuneHistory[userId]) {
        fortuneHistory[userId] = {};
    }

    const lastTime = fortuneHistory[userId][category];
    if (!lastTime) return true;

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    return (now - lastTime) >= cooldown;
}

function setCooldown(userId, category) {
    if (!fortuneHistory[userId]) {
        fortuneHistory[userId] = {};
    }
    fortuneHistory[userId][category] = Date.now();
    saveFortuneHistory();
}

function drawTarotCards(count = 3) {
    const allCards = [];

    tarotData.majorArcana.forEach(card => {
        allCards.push({ ...card, type: 'Major Arcana' });
    });

    Object.keys(tarotData.minorArcana).forEach(suit => {
        tarotData.minorArcana[suit].forEach(card => {
            allCards.push({ ...card, type: 'Minor Arcana', suit });
        });
    });

    const shuffled = allCards.sort(() => Math.random() - 0.5);
    const drawn = shuffled.slice(0, count);

    return drawn.map(card => ({
        ...card,
        reversed: Math.random() < 0.5
    }));
}

module.exports = {
    name: "fortune",
    description: "Dapatkan ramalan mistis dari AI 🔮",
    alias: ["ramalan", "nasib"],

    run: async (client, message, args) => {
        const category = args[0]?.toLowerCase() || 'general';
        const validCategories = ['love', 'career', 'health', 'money', 'today', 'general'];

        if (!validCategories.includes(category)) {
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🔮 Fortune Teller')
                .setDescription(`Kategori tidak valid! Pilih salah satu:\n\n${validCategories.map(c => `\`${c}\``).join(', ')}`)
                .addFields({
                    name: '📖 Cara Pakai',
                    value: '`!fortune [kategori]`\nContoh: `!fortune love`'
                })
                .setFooter({ text: 'Atau gunakan !tarot untuk tarot reading' });

            return message.reply({ embeds: [embed] });
        }

        // Check cooldown
        if (!checkCooldown(message.author.id, category)) {
            const lastTime = fortuneHistory[message.author.id][category];
            const timeLeft = 24 * 60 * 60 * 1000 - (Date.now() - lastTime);
            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('⏰ Cooldown Active')
                .setDescription(`Kamu sudah mendapat ramalan **${category}** hari ini!\n\nCoba lagi dalam: **${hoursLeft}h ${minutesLeft}m**`)
                .setFooter({ text: 'Ramalan tersedia 1x per 24 jam per kategori' });

            return message.reply({ embeds: [embed] });
        }

        // Loading message
        const loadingEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🔮 Memanggil Energi Mistis...')
            .setDescription('*Kristal bola bersinar... Kartu tarot bergetar...*')
            .setTimestamp();

        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

        try {
            const categoryNames = {
                love: 'Cinta & Hubungan',
                career: 'Karir & Pekerjaan',
                health: 'Kesehatan',
                money: 'Keuangan',
                today: 'Hari Ini',
                general: 'Umum'
            };

            const systemPrompt = `Kamu adalah peramal mistis yang bijaksana dan misterius bernama "Mystic Oracle". Berikan ramalan yang mystical, puitis, dan penuh makna. Gunakan bahasa Indonesia yang indah dan sedikit misterius. Jangan terlalu serius tapi juga jangan terlalu random. Maksimal 4-5 kalimat. Gunakan beberapa emoji mystical seperti ✨🌙⭐🔮 tapi jangan berlebihan.`;

            const text = `Berikan ramalan untuk ${message.author.username} tentang ${categoryNames[category]}. Tanggal: ${new Date().toLocaleDateString('id-ID')}`;

            const response = await generateText(text, systemPrompt, `fortune-${message.author.id}`);

            if (response && response.result) {
                // Set cooldown
                setCooldown(message.author.id, category);

                const fortuneEmbed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setAuthor({
                        name: '🔮 Mystic Oracle',
                        iconURL: client.user.displayAvatarURL()
                    })
                    .setTitle(`Ramalan ${categoryNames[category]}`)
                    .setDescription(`*Untuk ${message.author.username}*\n\n${response.result}`)
                    .addFields(
                        { name: '📅 Tanggal', value: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), inline: true },
                        { name: '🎴 Kategori', value: categoryNames[category], inline: true }
                    )
                    .setFooter({ text: 'Ramalan ini berlaku untuk 24 jam ke depan' })
                    .setTimestamp();

                await loadingMsg.edit({ embeds: [fortuneEmbed] });
            } else {
                throw new Error('No result from AI');
            }
        } catch (error) {
            console.error('Fortune error:', error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('❌ Energi Mistis Terganggu')
                .setDescription('Maaf, kristal bola sedang berawan. Coba lagi sebentar lagi.')
                .setTimestamp();

            await loadingMsg.edit({ embeds: [errorEmbed] });
        }
    },

    // Tarot reading command
    tarot: {
        name: "tarot",
        description: "Dapatkan tarot card reading 🎴",
        alias: ["kartu", "cards"],

        run: async (client, message, args) => {
            // Check cooldown
            if (!checkCooldown(message.author.id, 'tarot')) {
                const lastTime = fortuneHistory[message.author.id]['tarot'];
                const timeLeft = 24 * 60 * 60 * 1000 - (Date.now() - lastTime);
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('⏰ Cooldown Active')
                    .setDescription(`Kamu sudah mendapat tarot reading hari ini!\n\nCoba lagi dalam: **${hoursLeft}h ${minutesLeft}m**`)
                    .setFooter({ text: 'Tarot reading tersedia 1x per 24 jam' });

                return message.reply({ embeds: [embed] });
            }

            // Loading
            const loadingEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎴 Mengocok Kartu Tarot...')
                .setDescription('*Kartu-kartu tarot berputar dalam energi mistis...*')
                .setTimestamp();

            const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

            try {
                // Draw 3 cards
                const cards = drawTarotCards(3);
                const positions = ['Past (Masa Lalu)', 'Present (Saat Ini)', 'Future (Masa Depan)'];

                // Build card description
                const cardDescriptions = cards.map((card, index) => {
                    const meaning = card.reversed ? card.reversed : card.upright;
                    const orientation = card.reversed ? '(Reversed)' : '(Upright)';
                    return `**${positions[index]}**\n🎴 ${card.name} ${orientation}\n*${meaning}*`;
                }).join('\n\n');

                // Build context for AI
                const cardContext = cards.map((card, index) => {
                    return `${positions[index]}: ${card.name} ${card.reversed ? '(Reversed)' : '(Upright)'} - ${card.reversed ? card.reversed : card.upright}`;
                }).join(', ');

                const systemPrompt = `Kamu adalah master tarot reader yang bijaksana dan mystical. Berikan interpretasi tarot reading yang mendalam, puitis, dan penuh makna. Gunakan bahasa Indonesia yang indah. Hubungkan ketiga kartu (Past, Present, Future) menjadi satu cerita yang koheren. Maksimal 5-6 kalimat. Gunakan emoji mystical secukupnya.`;

                const text = `Berikan interpretasi tarot reading untuk ${message.author.username}. Kartu yang ditarik: ${cardContext}`;

                const response = await generateText(text, systemPrompt, `tarot-${message.author.id}`);

                if (response && response.result) {
                    // Set cooldown
                    setCooldown(message.author.id, 'tarot');

                    const tarotEmbed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setAuthor({
                            name: '🎴 Tarot Reading',
                            iconURL: client.user.displayAvatarURL()
                        })
                        .setTitle(`Reading untuk ${message.author.username}`)
                        .setDescription(cardDescriptions)
                        .addFields({
                            name: '🔮 Interpretasi Mystical',
                            value: response.result
                        })
                        .setFooter({ text: 'Renungkan pesan dari kartu-kartu ini' })
                        .setTimestamp();

                    await loadingMsg.edit({ embeds: [tarotEmbed] });
                } else {
                    throw new Error('No result from AI');
                }
            } catch (error) {
                console.error('Tarot error:', error);

                const errorEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('❌ Kartu Tarot Terganggu')
                    .setDescription('Energi mistis sedang tidak stabil. Coba lagi sebentar.')
                    .setTimestamp();

                await loadingMsg.edit({ embeds: [errorEmbed] });
            }
        }
    }
};
