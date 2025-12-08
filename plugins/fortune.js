const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { generateText } = require('../utils/aiHelper');
const fs = require('fs');
const path = require('path');

const tarotPath = path.join(__dirname, '../data/tarotCards.json');
const fortuneHistoryPath = path.join(__dirname, '../data/fortuneHistory.json');

let tarotData = {};
if (fs.existsSync(tarotPath)) {
    tarotData = JSON.parse(fs.readFileSync(tarotPath, 'utf8'));
}

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
    const cooldown = 24 * 60 * 60 * 1000;

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

async function performFortuneTelling(client, message, category, menuMsg = null) {
    const categoryNames = {
        love: 'Love & Relationship',
        career: 'Career & Work',
        health: 'Health',
        money: 'Finance',
        today: 'Today',
        general: 'General'
    };

    let seconds = 0;
    const loadingEmbed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('🔮 Fortune Teller')
        .setDescription(`Reading your fortune about:\n**${categoryNames[category]}**`)
        .setTimestamp()
        .addFields(
            { name: '⏱️ Duration', value: `0 Sec`, inline: true },
            { name: '📊 Status', value: `Connecting to mystical energy...`, inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.tag}` });

    const loadingMsg = menuMsg || await message.channel.send({ embeds: [loadingEmbed] });
    if (menuMsg) {
        await menuMsg.edit({ embeds: [loadingEmbed], components: [] });
    }

    const timer = setInterval(() => {
        seconds++;
        const updated = EmbedBuilder.from(loadingEmbed)
            .setFields(
                { name: '⏱️ Duration', value: `${seconds} Sec`, inline: true },
                { name: '📊 Status', value: `Channeling cosmic wisdom...`, inline: true }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` });
        loadingMsg.edit({ embeds: [updated] }).catch(() => { });
    }, 1000);

    try {
        const systemPrompt = `Kamu adalah peramal mistis yang bijaksana dan misterius bernama "Mystic Oracle". Berikan ramalan yang mystical, puitis, dan penuh makna. Gunakan bahasa Indonesia yang indah dan sedikit misterius. Jangan terlalu serius tapi juga jangan terlalu random. Maksimal 4-5 kalimat. Gunakan beberapa emoji mystical seperti ✨🌙⭐🔮 tapi jangan berlebihan.`;

        const text = `Berikan ramalan untuk ${message.author.username} tentang ${categoryNames[category]}. Tanggal: ${new Date().toLocaleDateString('id-ID')}`;

        const response = await generateText(text, systemPrompt, `fortune-${message.author.id}`);

        clearInterval(timer);

        if (response && response.result) {
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
                    { name: '🎴 Kategori', value: categoryNames[category], inline: true },
                    { name: '⏱️ Response Time', value: `${seconds} Sec`, inline: true }
                )
                .setFooter({ text: 'Ramalan ini berlaku untuk 24 jam ke depan' })
                .setTimestamp();

            await loadingMsg.edit({ embeds: [fortuneEmbed] });
        } else {
            throw new Error('No result from AI');
        }
    } catch (error) {
        clearInterval(timer);
        console.error('Fortune error:', error);

        const errorEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('❌ Energi Mistis Terganggu')
            .setDescription('Maaf, kristal bola sedang berawan. Coba lagi sebentar lagi.')
            .setTimestamp();

        await loadingMsg.edit({ embeds: [errorEmbed] });
    }
}

module.exports = {
    name: "fortune",
    description: "Get mystical fortune reading from AI 🔮",
    alias: ["ramalan", "nasib"],

    run: async (client, message, args) => {
        const category = args[0]?.toLowerCase();
        const validCategories = ['love', 'career', 'health', 'money', 'today', 'general'];

        if (category && validCategories.includes(category)) {
            if (!checkCooldown(message.author.id, category)) {
                const lastTime = fortuneHistory[message.author.id][category];
                const timeLeft = 24 * 60 * 60 * 1000 - (Date.now() - lastTime);
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('⏰ Cooldown Active')
                    .setDescription(`You already received a **${category}** fortune today!\n\nTry again in: **${hoursLeft}h ${minutesLeft}m**`)
                    .setFooter({ text: 'Fortune available once per 24 hours per category' });

                return message.reply({ embeds: [embed] });
            }

            return await performFortuneTelling(client, message, category);
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`fortune_select_${message.author.id}`)
            .setPlaceholder('Choose a fortune category...')
            .addOptions([
                {
                    label: 'Love & Relationship',
                    description: 'Fortune about your love life',
                    value: 'love',
                    // emoji: '💕'
                },
                {
                    label: 'Career & Work',
                    description: 'Fortune about your career',
                    value: 'career',
                    // emoji: '💼'
                },
                {
                    label: 'Health',
                    description: 'Fortune about your health',
                    value: 'health',
                    // emoji: '🏥'
                },
                {
                    label: 'Finance',
                    description: 'Fortune about your money',
                    value: 'money',
                    // emoji: '💰'
                },
                {
                    label: 'Today',
                    description: 'Fortune for today',
                    value: 'today',
                    // emoji: '📅'
                },
                {
                    label: 'General',
                    description: 'General fortune reading',
                    value: 'general',
                    // emoji: '✨'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const menuEmbed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🔮 Fortune Teller')
            .setDescription('Select a category to receive your mystical fortune reading.\n\n**Available Categories:**\n - Love & Relationship\n - Career & Work\n - Health\n - Finance\n - Today\n - General')
            .setFooter({ text: 'Select from the menu below' })
            .setTimestamp();

        const menuMsg = await message.reply({ embeds: [menuEmbed], components: [row] });

        const collector = menuMsg.createMessageComponentCollector({
            filter: (i) => i.customId === `fortune_select_${message.author.id}` && i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async (interaction) => {
            const selectedCategory = interaction.values[0];

            if (!checkCooldown(message.author.id, selectedCategory)) {
                const lastTime = fortuneHistory[message.author.id][selectedCategory];
                const timeLeft = 24 * 60 * 60 * 1000 - (Date.now() - lastTime);
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                await interaction.update({
                    embeds: [new EmbedBuilder()
                        .setColor('#E74C3C')
                        .setTitle('⏰ Cooldown Active')
                        .setDescription(`Kamu sudah mendapat ramalan **${selectedCategory}** hari ini!\n\nCoba lagi dalam: **${hoursLeft}h ${minutesLeft}m**`)
                        .setFooter({ text: 'Ramalan tersedia 1x per 24 jam per kategori' })],
                    components: []
                });
                return;
            }

            await interaction.deferUpdate();
            await performFortuneTelling(client, message, selectedCategory, menuMsg);
            collector.stop();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                menuMsg.edit({ components: [] }).catch(() => { });
            }
        });
    },

    tarot: {
        name: "tarot",
        description: "Get tarot card reading 🎴",
        alias: ["kartu", "cards"],

        run: async (client, message, args) => {
            if (!checkCooldown(message.author.id, 'tarot')) {
                const lastTime = fortuneHistory[message.author.id]['tarot'];
                const timeLeft = 24 * 60 * 60 * 1000 - (Date.now() - lastTime);
                const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
                const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('⏰ Cooldown Active')
                    .setDescription(`You already received a tarot reading today!\n\nTry again in: **${hoursLeft}h ${minutesLeft}m**`)
                    .setFooter({ text: 'Tarot reading available once per 24 hours' });

                return message.reply({ embeds: [embed] });
            }

            let seconds = 0;
            const loadingEmbed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎴 Tarot Reading')
                .setDescription('Shuffling the mystical tarot cards...')
                .setTimestamp()
                .addFields(
                    { name: '⏱️ Duration', value: `0 Sec`, inline: true },
                    { name: '📊 Status', value: `Drawing cards...`, inline: true }
                )
                .setFooter({ text: `Requested by ${message.author.tag}` });

            const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

            const timer = setInterval(() => {
                seconds++;
                const updated = EmbedBuilder.from(loadingEmbed)
                    .setFields(
                        { name: '⏱️ Duration', value: `${seconds} Sec`, inline: true },
                        { name: '📊 Status', value: `Interpreting the cards...`, inline: true }
                    )
                    .setFooter({ text: `Requested by ${message.author.tag}` });
                loadingMsg.edit({ embeds: [updated] }).catch(() => { });
            }, 1000);

            try {
                const cards = drawTarotCards(3);
                const positions = ['Past', 'Present', 'Future'];

                const cardDescriptions = cards.map((card, index) => {
                    const meaning = card.reversed ? card.reversed : card.upright;
                    const orientation = card.reversed ? '(Reversed)' : '(Upright)';
                    return `**${positions[index]}**\n🎴 ${card.name} ${orientation}\n*${meaning}*`;
                }).join('\n\n');

                const cardContext = cards.map((card, index) => {
                    return `${positions[index]}: ${card.name} ${card.reversed ? '(Reversed)' : '(Upright)'} - ${card.reversed ? card.reversed : card.upright}`;
                }).join(', ');

                const systemPrompt = `You are a master tarot reader who is wise and mystical. Provide deep, poetic, and meaningful tarot interpretations. Use beautiful English. Connect the three cards (Past, Present, Future) into one coherent story. Maximum 5-6 sentences. Use mystical emojis sparingly.`;

                const text = `Provide a tarot reading interpretation for ${message.author.username}. Cards drawn: ${cardContext}`;

                const response = await generateText(text, systemPrompt, `tarot-${message.author.id}`);

                clearInterval(timer);

                if (response && response.result) {
                    setCooldown(message.author.id, 'tarot');

                    const tarotEmbed = new EmbedBuilder()
                        .setColor('#9B59B6')
                        .setAuthor({
                            name: '🎴 Tarot Reading',
                            iconURL: client.user.displayAvatarURL()
                        })
                        .setTitle(`Reading for ${message.author.username}`)
                        .setDescription(cardDescriptions)
                        .addFields(
                            {
                                name: '🔮 Mystical Interpretation',
                                value: response.result
                            },
                            {
                                name: '⏱️ Response Time',
                                value: `${seconds} Sec`,
                                inline: true
                            }
                        )
                        .setFooter({ text: 'Reflect on the message from these cards' })
                        .setTimestamp();

                    await loadingMsg.edit({ embeds: [tarotEmbed] });
                } else {
                    throw new Error('No result from AI');
                }
            } catch (error) {
                clearInterval(timer);
                console.error('Tarot error:', error);

                const errorEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('❌ Tarot Cards Disrupted')
                    .setDescription('The mystical energy is unstable. Please try again later.')
                    .setTimestamp();

                await loadingMsg.edit({ embeds: [errorEmbed] });
            }
        }
    }
};
