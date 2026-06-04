const { cardGame } = require("../utils/cardGame");
const { baseEmbed, economyFields, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

module.exports = {
    name: "upgrade",
    alias: ["cardupgrade"],
    description: "Naikkan level kartu menggunakan gold dan material",
    run: async (client, message, args) => {
        try {
            requireGameChannel(message);
            
            // Hitung biaya sebelum upgrade
            const player = cardGame.getPlayer(message.guild.id, message.author.id);
            const card = cardGame.findCard(message.guild.id, message.author.id, args[0]);
            const levels = Number(args[1] || 1);
            
            if (!Number.isInteger(levels) || levels < 1 || levels > 10) {
                return message.reply("❌ Jumlah level harus 1-10.");
            }
            if (card.level + levels > 100) {
                return message.reply("❌ Level kartu maksimal 100.");
            }
            
            const goldCostPerLevel = Array.from({ length: levels }, (_, i) => (card.level + i) * 25);
            const totalGoldCost = goldCostPerLevel.reduce((a, b) => a + b, 0);
            const totalMaterialCost = levels * 10;
            
            // Upgrade kartu
            const result = cardGame.upgrade(message.guild.id, message.author.id, args[0], levels);
            const stats = await cardGame.hydrateCard(result.card);
            const updatedPlayer = cardGame.getPlayer(message.guild.id, message.author.id);
            
            const costBreakdown = goldCostPerLevel.length <= 5 
                ? goldCostPerLevel.map((cost, i) => `Lv ${card.level + i}→${card.level + i + 1}: ${cost.toLocaleString("id-ID")} gold`).join("\n")
                : `Lv ${card.level}→${card.level + levels}: ${totalGoldCost.toLocaleString("id-ID")} total`;
            
            const embed = baseEmbed("✅ Upgrade Berhasil", message.author.tag)
                .setDescription(`${formatCard(result.card)}\nLevel: **${card.level} ➜ ${result.card.level}**\nPower: **${stats.power.toLocaleString("id-ID")}**`)
                .addFields(
                    { name: "💰 Biaya Gold", value: costBreakdown, inline: false },
                    { name: "⚙️ Material", value: `${totalMaterialCost.toLocaleString("id-ID")} material`, inline: true },
                    { name: "💸 Total", value: `${totalGoldCost.toLocaleString("id-ID")} gold + ${totalMaterialCost.toLocaleString("id-ID")} material`, inline: true }
                )
                .addFields(...economyFields(updatedPlayer));
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
