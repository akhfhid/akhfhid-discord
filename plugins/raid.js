const { cardGame } = require("../utils/cardGame");
const { baseEmbed, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "raid",
    alias: ["boss"],
    description: "Serang raid boss bersama pemain satu server",
    run: async (client, message) => {
        try {
            requireGameChannel(message);
            await message.channel.sendTyping();
            const result = await cardGame.raid(message.guild.id, message.author.id);
            const defeated = result.boss.hp === 0;
            const ownReward = result.rewards?.[message.author.id];
            const embed = baseEmbed(defeated ? "Raid Boss Dikalahkan" : `Raid Boss: ${result.boss.name}`, message.author.tag)
                .setDescription(
                    `${formatCard(result.strongest.instance)} memberikan **${result.damage.toLocaleString("id-ID")} damage**.\n\n` +
                    `Boss HP: **${result.boss.hp.toLocaleString("id-ID")} / ${result.boss.maxHp.toLocaleString("id-ID")}**\n` +
                    `Kontributor: **${Object.keys(result.boss.contributors).length} pemain**` +
                    (ownReward ? `\n\nReward kamu: **${ownReward.gold} gold, ${ownReward.materials} material, ${ownReward.tickets} ticket**` : "")
                );
            if (result.boss.image) embed.setImage(result.boss.image);
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
