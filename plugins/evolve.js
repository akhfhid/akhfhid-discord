const { cardGame } = require("../utils/cardGame");
const { baseEmbed, economyFields, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "evolve",
    alias: ["evo"],
    description: "Evolve kartu sampai evo 3",
    run: async (client, message, args) => {
        try {
            requireGameChannel(message);
            const result = cardGame.evolve(message.guild.id, message.author.id, args[0]);
            const player = cardGame.getPlayer(message.guild.id, message.author.id);
            return message.reply({ embeds: [baseEmbed("Evolve Berhasil", message.author.tag)
                .setDescription(`${formatCard(result.card)}\nBiaya: **${result.goldCost} gold** + **${result.materialCost} material**`)
                .addFields(...economyFields(player))] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
