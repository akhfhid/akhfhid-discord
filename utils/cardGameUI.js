const { EmbedBuilder } = require("discord.js");
const { CardGameError, cardGame } = require("./cardGame");

const COLOR = "#E67E22";

function requireGameChannel(message) {
    if (!message.guild) throw new CardGameError("Command ini hanya bisa dipakai di server.");
    cardGame.requireActiveChannel(message.guild.id, message.channel.id);
}

function formatCard(card, power) {
    const powerText = power === undefined ? "" : ` | PWR ${Number(power).toLocaleString("id-ID")}`;
    return `\`${card.instanceId}\` **${card.name}** [${String(card.rarity).replace(/_/g, " ")}] Lv.${card.level} E${card.evo} A${card.ascension}${powerText}`;
}

function economyFields(player) {
    return [
        { name: "Gold", value: player.gold.toLocaleString("id-ID"), inline: true },
        { name: "Ticket", value: player.tickets.toLocaleString("id-ID"), inline: true },
        { name: "Material", value: player.materials.toLocaleString("id-ID"), inline: true },
    ];
}

function baseEmbed(title, requestedBy) {
    return new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(title)
        .setFooter({ text: `Requested by ${requestedBy} | Dangodeck Card Game` })
        .setTimestamp();
}

function errorMessage(error) {
    console.error("Card game command error:", error);
    return error instanceof CardGameError ? error.message : "Terjadi kesalahan pada card game.";
}

module.exports = { COLOR, baseEmbed, economyFields, errorMessage, formatCard, requireGameChannel };
