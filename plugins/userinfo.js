const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "userinfo",
    description: "Displays detailed information about a user",
    alias: ["ui", "whois"],
    run: async (client, message, args) => {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);

        const embed = new EmbedBuilder()
            .setColor('#4A90E2')
            .setTitle(`👤 User Information: ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '✨ Username', value: user.tag, inline: true },
                { name: '🆔 User ID', value: user.id, inline: true },
                { name: '🤖 Bot Account', value: user.bot ? 'Yes' : 'No', inline: true },

                { name: '📌 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },

                {
                    name: '🎭 Roles',
                    value: member.roles.cache
                        .filter(r => r.id !== message.guild.id)
                        .map(r => `${r}`).join(' ') || 'No roles',
                    inline: false
                }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }
};
