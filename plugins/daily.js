const { cardGame } = require("../utils/cardGame");
const { baseEmbed, economyFields, errorMessage, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "daily",
    alias: ["carddaily"],
    description: "Ambil hadiah harian card game",
    run: async (client, message) => {
        try {
            requireGameChannel(message);
            const reward = cardGame.claimDaily(message.guild.id, message.author.id);
            const player = cardGame.getPlayer(message.guild.id, message.author.id);
            const embed = baseEmbed("Daily Reward", message.author.tag)
                .setDescription(`Kamu mendapat **${reward.gold} gold**, **${reward.tickets} ticket**, dan **${reward.materials} material**.`)
                .addFields(...economyFields(player));
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
