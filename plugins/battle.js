const { cardGame } = require("../utils/cardGame");
const { baseEmbed, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "battle",
    alias: ["duel", "pvp"],
    description: "Battle kartu terkuat melawan pemain lain",
    run: async (client, message) => {
        try {
            requireGameChannel(message);
            const opponent = message.mentions.users.first();
            if (!opponent || opponent.bot) return message.reply("Mention pemain yang ingin dilawan. Contoh: `!battle @user`.");
            await message.channel.sendTyping();
            const result = await cardGame.battle(message.guild.id, message.author.id, opponent.id);
            const winner = result.winnerId === message.author.id ? message.author : opponent;
            const embed = baseEmbed("Card Battle", message.author.tag)
                .setDescription(
                    `${message.author} menggunakan ${formatCard(result.left.instance)}\n` +
                    `${opponent} menggunakan ${formatCard(result.right.instance)}\n\n` +
                    `Score: **${result.leftScore.toLocaleString("id-ID")}** vs **${result.rightScore.toLocaleString("id-ID")}**\n` +
                    `Pemenang: ${winner}\n\nReward pemenang: **300 gold + 20 material**`
                );
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
