const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "serverinfo",
    description: "Shows information about the server",
    alias: ["si", "server"],
    run: async (client, message, args) => {
        const { guild } = message;

        const embed = new EmbedBuilder()
            .setColor('#1E1F22')
            .setTitle(`🌐 ${guild.name}`)
            .setDescription(`A detailed overview of this server`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))

            .addFields(
                {
                    name: '📅 Server Details',
                    value:
                        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>
**Region:** ${guild.preferredLocale}
**Owner:** <@${guild.ownerId}>`,
                    inline: false
                }
            )

            .addFields(
                {
                    name: '👥 Members & Structure',
                    value:
                        `**Members:** ${guild.memberCount}
**Roles:** ${guild.roles.cache.size}
**Channels:** ${guild.channels.cache.size}`,
                    inline: false
                }
            )

            .addFields(
                {
                    name: '💎 Boost Information',
                    value:
                        `**Boost Level:** ${guild.premiumTier}
**Boost Count:** ${guild.premiumSubscriptionCount || 0}`,
                    inline: false
                }
            )

            .setImage(guild.bannerURL({ size: 2048 }))
            .setFooter({ text: `Server ID • ${guild.id}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }
};