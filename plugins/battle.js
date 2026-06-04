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
            
            // Build detailed battle narrative prompt
            const winnerCardInfo = result.winnerCard.instance;
            const loserCardInfo = result.loserCard.instance;
            const factors = result.battleFactors;
            
            const narrativePrompt = `Kamu adalah naratornya pertarungan anime kartu yang sangat SERU dan DRAMATIC! Buatlah cerita pertarungan yang PANJANG (minimal 6-8 kalimat) dan DETAIL tentang duel kartu anime ini.

DETAIL PERTARUNGAN:
⭐ PEMENANG: ${message.author.username} 
- Kartu: ${result.left.instance.name} (${result.left.instance.anime})
- Element: ${result.left.instance.element}
- Rarity: ${result.left.instance.rarity.toUpperCase()}
- Level: ${result.left.instance.level} | Evo: ${result.left.instance.evo}
- Power: ${result.leftScore}

📍 YANG KALAH: ${opponent.username}
- Kartu: ${result.right.instance.name} (${result.right.instance.anime})
- Element: ${result.right.instance.element}
- Rarity: ${result.right.instance.rarity.toUpperCase()}
- Level: ${result.right.instance.level} | Evo: ${result.right.instance.evo}
- Power: ${result.rightScore}

JANGAN HANYA FOKUS KE POWER! Jelaskan:
1. Bagaimana pertarungan dimulai dengan deskripsi dramatis
2. Tactic atau skill apa yang digunakan pemenang
3. Kelemahan atau kesalahan yang dilakukan yang kalah
4. Penjelasan rarity/level/evo/element yang mempengaruhi hasil
5. Momen climax yang sangat seru
6. Hasil akhir yang memukau

Tulis dengan bahasa Indonesia yang casual tapi dramatis seperti komentar anime! Make it EPIC!`;
            
            let narrativeText = "";
            try {
                const response = await groq.chat({
                    messages: [{ role: "user", content: narrativePrompt }],
                    model: "groq/compound-mini",
                });
                narrativeText = response?.message || "";
            } catch (error) {
                console.error("AI Narrative Error:", error?.message);
                narrativeText = `Setelah pertarungan yang sengit, ${winner.username} berhasil memenangkan duel! ${result.left.instance.name} mengungguli ${result.right.instance.name} dengan power ${result.leftScore} vs ${result.rightScore}. Ini adalah pertarungan yang penuh drama dan kejutan!`;
            }
            
            const embed = baseEmbed("⚔️ CARD BATTLE RUMBLE ⚔️", message.author.tag)
                .setDescription(
                    `**${message.author.username}** ⚡ vs ⚡ **${opponent.username}**\n\n` +
                    `**${result.left.instance.name}** [${result.left.instance.anime}]\n` +
                    `Rarity: ${result.left.instance.rarity} | Level: ${result.left.instance.level} | Evo: ${result.left.instance.evo}\n` +
                    `Element: ${result.left.instance.element} | Power: ${result.leftScore}\n\n` +
                    `═══════════════════════\n\n` +
                    `**${result.right.instance.name}** [${result.right.instance.anime}]\n` +
                    `Rarity: ${result.right.instance.rarity} | Level: ${result.right.instance.level} | Evo: ${result.right.instance.evo}\n` +
                    `Element: ${result.right.instance.element} | Power: ${result.rightScore}\n\n`
                )
                .addFields({
                    name: "🏆 PEMENANG",
                    value: `👑 **${winner.username}** menang dengan score ${result.leftScore > result.rightScore ? result.leftScore : result.rightScore}`
                })
                .addFields({
                    name: "📖 NARASI PERTARUNGAN",
                    value: narrativeText.slice(0, 1024) // Discord field limit
                })
                .addFields({
                    name: "💰 REWARD",
                    value: `**+300 gold** | **+20 material**`
                })
                .setColor(winner.id === message.author.id ? "#FFD700" : "#C0C0C0");
            
            return message.reply({ embeds: [embed] });
        } catch (error) {
            return message.reply(errorMessage(error));
        }
    },
};
