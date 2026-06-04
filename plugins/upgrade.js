const { cardGame } = require("../utils/cardGame");
const { baseEmbed, economyFields, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "upgrade",
    alias: ["cardupgrade"],
    description: "Naikkan level kartu menggunakan gold dan material",
    run: async (client, message, args) => {
        try {
            requireGameChannel(message);
            const result = cardGame.upgrade(message.guild.id, message.author.id, args[0], args[1] || 1);
            const stats = await cardGame.hydrateCard(result.card);
            const player = cardGame.getPlayer(message.guild.id, message.author.id);
            const embed = baseEmbed("Upgrade Berhasil", message.author.tag)
                .setDescription(`${formatCard(result.card)}\nPower sekarang: **${stats.power.toLocaleString("id-ID")}**\nBiaya: **${result.goldCost} gold** + **${result.materialCost} material**`)
                .addFields(...economyFields(player));
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
