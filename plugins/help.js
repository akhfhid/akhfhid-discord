const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "help",
    description: "Displays a list of all available commands",
    alias: ["h", "commands"],
    run: async (client, message, args) => {
        const sortedCommands = Array.from(client.commands.values())
            .sort((a, b) => a.name.localeCompare(b.name));

        const embed = new EmbedBuilder()
            .setColor('#4A90E2')
            .setTitle('Command List')
            .setDescription('Here are all available commands you can use:')
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}` });

        let commandList = '';
        sortedCommands.forEach(cmd => {
            commandList += `**!${cmd.name}** — *${cmd.description || 'No description available'}*\n`;

            if (cmd.alias && cmd.alias.length > 0) {
                commandList += `   ➤ **Aliases:** ${cmd.alias.map(a => `\`${a}\``).join(', ')}\n`;
            }

            commandList += '\n';
        });

        embed.addFields({
            name: `Total Commands (${client.commands.size})`,
            value: commandList || 'No commands available.'
        });

        message.channel.send({ embeds: [embed] });
    }
};
