const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menulist')
        .setDescription('Menampilkan daftar command yang bisa kamu pilih untuk info lebih lanjut.'),

    async execute(interaction) {
        const commands = Array.from(interaction.client.commands.values());

        const options = commands.map(cmd => ({
            label: cmd.name,
            description: (cmd.description || 'Tidak ada deskripsi.').substring(0, 100),
            value: cmd.name,
            emoji: '🔧'
        }));

        if (options.length === 0) {
            return interaction.reply({
                content: 'Tidak ada command yang tersedia saat ini.',
                ephemeral: true
            });
        }
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu_select')
            .setPlaceholder('Pilih sebuah command untuk melihat detailnya...')
            .addOptions(options);

        const actionRow = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('Commmand List ')
            .setDescription(`Hai ${interaction.user.toString()}! Ada ${commands.length} command yang tersedia. Silakan pilih dari menu di bawah untuk melihat informasi lebih lanjut.`)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            components: [actionRow]
        });
    }
};