const { cardGame } = require("../utils/cardGame");
const { baseEmbed, economyFields, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "inventory",
    alias: ["inv", "deck"],
    description: "Lihat koleksi dan kartu terkuatmu",
    run: async (client, message) => {
        try {
            requireGameChannel(message);
            await message.channel.sendTyping();
            const player = cardGame.getPlayer(message.guild.id, message.author.id);
            const cards = await Promise.all(player.cards.slice(0, 30).map(async (card) => ({
                card,
                stats: await cardGame.hydrateCard(card),
            })));
            cards.sort((a, b) => b.stats.power - a.stats.power);
            const description = cards.length
                ? cards.map(({ card, stats }) => formatCard(card, stats.power)).join("\n")
                : "Inventory kosong. Gunakan `!gacha` untuk mendapatkan kartu.";
            const embed = baseEmbed(`Inventory ${message.author.username}`, message.author.tag)
                .setDescription(description.slice(0, 4000))
                .addFields(...economyFields(player), {
                    name: "Koleksi",
                    value: `${player.cards.length} kartu${player.cards.length > 30 ? " (menampilkan 30 terkuat)" : ""}`,
                    inline: true,
                });
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
