const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Cek kecepatan respon bot'),
    async execute(interaction) {
        const sent = await interaction.reply({
            content: 'Mengukur ping...',
            withResponse: true
        });
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Latensi Bot', value: `${timeDiff}ms`, inline: true },
                { name: 'Latensi API', value: `${apiLatency}ms`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};