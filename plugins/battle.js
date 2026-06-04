const { cardGame } = require("../utils/cardGame");
const { baseEmbed, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");
const Groq = require("../utils/groq");

const groq = new Groq();

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
            const loser = result.winnerId === message.author.id ? opponent : message.author;
            
            // Generate dialog AI
            const dialogPrompt = `Kamu adalah commentator pertarungan kartu anime. Buatlah narasi dialog singkat (3-4 kalimat) untuk menjelaskan hasil battle. 
Kartu ${message.author.username}: ${result.left.instance.name} (${result.left.instance.anime}) Power: ${result.leftScore} vs Kartu ${opponent.username}: ${result.right.instance.name} (${result.right.instance.anime}) Power: ${result.rightScore}
${winner.username} menang. Jelaskan secara dramatis dan seru kenapa ${winner.username} menang dengan dialog percakapan singkat. Gunakan bahasa Indonesia casual.`;
            
            let dialogText = "";
            try {
                const response = await groq.chat({
                    messages: [{ role: "user", content: dialogPrompt }],
                    model: "groq/compound-mini",
                });
                dialogText = response?.message || "";
            } catch (error) {
                console.error("AI Dialog Error:", error?.message);
                dialogText = `${winner} berhasil mengalahkan ${loser}!`;
            }
            
            const embed = baseEmbed("⚔️ Card Battle Result", message.author.tag)
                .setDescription(
                    `**${message.author.username}** vs **${opponent.username}**\n\n` +
                    `${formatCard(result.left.instance)}\n**Power:** ${result.leftScore.toLocaleString("id-ID")}\n\n` +
                    `vs\n\n` +
                    `${formatCard(result.right.instance)}\n**Power:** ${result.rightScore.toLocaleString("id-ID")}\n\n` +
                    `━━━━━━━━━━━━━━━━\n` +
                    `**🏆 Pemenang: ${winner}**\n\n` +
                    `📖 **Narasi:**\n${dialogText}\n\n` +
                    `💰 **Reward:** +300 gold, +20 material`
                )
                .setColor(winner.id === message.author.id ? "#00FF00" : "#FF0000");
            
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
