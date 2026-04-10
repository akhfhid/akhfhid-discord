const { EmbedBuilder } = require('discord.js');

function sanitizeText(text, maxLength) {
    if (!text) return "";
    const normalized = String(text).replace(/\s+/g, " ").trim();
    if (!maxLength || normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

module.exports = {
    name: "help",
    description: "Displays a list of all available commands",
    alias: ["h", "commands", "menu", "menulist"],
    run: async (client, message, args) => {
        try {
            const canEmbed = message.channel
                .permissionsFor(client.user)
                ?.has("EmbedLinks");

            const sortedCommands = Array.from(client.commands.values())
                .sort((a, b) => a.name.localeCompare(b.name));

            if (!canEmbed) {
                const list = sortedCommands.map((c) => `!${c.name}`).join(", ");
                await message.channel.send(`Command list: ${list}`);
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#4A90E2')
                .setTitle('Command List')
                .setDescription('Here are all available commands you can use:')
                .setTimestamp()
                .setFooter({ text: `Requested by ${message.author.tag}` });

            let currentField = '';
            let fieldCount = 1;

            sortedCommands.forEach(cmd => {
                const desc = sanitizeText(cmd.description || 'No description available', 120);
                let entry = `**!${cmd.name}** — *${desc}*\n`;
                if (cmd.alias && cmd.alias.length > 0) {
                    const aliases = sanitizeText(
                        cmd.alias.map(a => `!${a}`).join(', '),
                        140
                    );
                    entry += `   ➤ **Alias:** ${aliases}\n`;
                }
                entry += '\n';

                if (entry.length > 900) {
                    entry = sanitizeText(entry, 900) + "\n";
                }

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

            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error("Help command error:", error?.message || error);
            const list = Array.from(client.commands.values())
                .map((c) => `!${c.name}`)
                .join(", ");
            await message.channel.send(`Command list: ${list}`);
        }
    }
};
