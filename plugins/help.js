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

        let currentField = '';
        let fieldCount = 1;

        sortedCommands.forEach(cmd => {
            let entry = `**!${cmd.name}** — *${cmd.description || 'No description available'}*\n`;
            if (cmd.alias && cmd.alias.length > 0) {
                entry += `   ➤ **Alias cmd:** ${cmd.alias.map(a => `\`${a}\``).join(', ')}\n`;
            }
            entry += '\n';

            // Discord limit is 1024, we use 900 to be safe
            if (currentField.length + entry.length > 900) {
                embed.addFields({
                    name: `Commands (Part ${fieldCount})`,
                    value: currentField
                });
                currentField = entry;
                fieldCount++;
            } else {
                currentField += entry;
            }
        });

        if (currentField.length > 0) {
            embed.addFields({
                name: fieldCount > 1 ? `Commands (Part ${fieldCount})` : `Total Commands (${client.commands.size})`,
                value: currentField
            });
        }

        message.channel.send({ embeds: [embed] });
    }
};
