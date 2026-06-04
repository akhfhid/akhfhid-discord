const { cardGame } = require("../utils/cardGame");
const { baseEmbed, economyFields, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "ascend",
    alias: ["ascension"],
    description: "Ascend kartu sampai ascension 5",
    run: async (client, message, args) => {
        try {
            requireGameChannel(message);
            const result = cardGame.ascend(message.guild.id, message.author.id, args[0]);
            const player = cardGame.getPlayer(message.guild.id, message.author.id);
            return message.reply({ embeds: [baseEmbed("Ascension Berhasil", message.author.tag)
                .setDescription(`${formatCard(result.card)}\nBiaya: **${result.goldCost} gold** + **${result.materialCost} material**`)
                .addFields(...economyFields(player))] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
