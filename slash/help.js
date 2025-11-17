const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Menampilkan daftar command yang tersedia'),
    async execute(interaction) {
        const commands = Array.from(interaction.client.commands.values());

        const commandsPerPage = 10;
        const totalPages = Math.ceil(commands.length / commandsPerPage);

        if (totalPages === 1) {
            const embed = createHelpEmbed(commands, 1, 1);
            await interaction.reply({ embeds: [embed] });
        } else {
            const embed = createHelpEmbed(commands.slice(0, commandsPerPage), 1, totalPages);
            await interaction.reply({
                embeds: [embed],
                components: createNavigationButtons(1, totalPages)
            });
        }
    }
};

function createHelpEmbed(commands, currentPage, totalPages) {
    let commandList = '';

    commands.forEach((command) => {
        commandList += `**!${command.name}** — ${command.description || 'Tidak ada deskripsi'}\n`;
        if (command.alias && command.alias.length > 0) {
            commandList += ` ➤ Alias: ${command.alias.join(', ')}\n`;
        }
        commandList += '\n';
    });

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📚 Daftar Command')
        .setDescription(commandList)
        .setFooter({ text: `Halaman ${currentPage} dari ${totalPages}` })
        .setTimestamp();

    return embed;
}

function createNavigationButtons(currentPage, totalPages) {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const row = new ActionRowBuilder();

    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`help_prev_${currentPage}`)
            .setLabel('◀️ Sebelumnya')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 1)
    );
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`help_page_${currentPage}`)
            .setLabel(`${currentPage}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`help_next_${currentPage}`)
            .setLabel('Selanjutnya ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages)
    );
    return row;
}