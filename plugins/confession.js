const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const confessionDataPath = path.join(__dirname, "../data/confessions.json");

function loadConfessionData() {
    if (fs.existsSync(confessionDataPath)) {
        try {
            return JSON.parse(fs.readFileSync(confessionDataPath, "utf8"));
        } catch (e) {
            console.error("Failed to load confession data:", e);
            return {};
        }
    }
    return {};
}

function saveConfessionData(data) {
    try {
        fs.writeFileSync(confessionDataPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
        console.error("Failed to save confession data:", e);
    }
}

module.exports = {
    name: "confessh",
    alias: ["confes", "confession"],
    description: "Create an anonymous confession box in a channel (Admin Only)",

    run: async (client, message, args) => {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("You need Administrator permission to use this command!");
        }

        const mentionedChannel = message.mentions.channels.first();
        if (!mentionedChannel) {
            return message.reply("Please mention a channel! Usage: `!confes #channel`");
        }

        if (mentionedChannel.type !== 0) {
            return message.reply("Please mention a valid text channel!");
        }
        const confessionData = loadConfessionData();
        const guildId = message.guild.id;

        if (!confessionData[guildId]) {
            confessionData[guildId] = { counter: 0 };
        }
        confessionData[guildId].counter++;
        const confessionNumber = confessionData[guildId].counter;

        saveConfessionData(confessionData);

        const embed = new EmbedBuilder()
            .setColor("#9B59B6")
            .setTitle(`AnonymousConfess(#${confessionNumber})`)
            .setDescription(
                "📝 **Anonymous Confession Box**\n\n" +
                "Share your thoughts, feelings, or secrets anonymously.\n" +
                "Click the button below to submit your confession.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "✨ Your identity will remain completely anonymous\n" +
                "💬 Be respectful and kind\n" +
                "🔒 Your confession will be posted in this channel"
            )
            .setFooter({ text: `Confession Box #${confessionNumber} • ${message.guild.name}` })
            .setTimestamp();

        const button = new ButtonBuilder()
            .setCustomId(`confession_submit_${mentionedChannel.id}_${confessionNumber}`)
            .setLabel("Submit a Confession")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📝");

        const row = new ActionRowBuilder().addComponents(button);

        try {
            await mentionedChannel.send({
                embeds: [embed],
                components: [row]
            });
            await message.reply(`Confession box #${confessionNumber} has been created in ${mentionedChannel.toString()}!`);
        } catch (error) {
            console.error("Error creating confession box:", error);
            await message.reply("Failed to create confession box. Please check bot permissions in that channel.");
        }
    }
};
