const { EmbedBuilder } = require("discord.js");
const { dangodeck, DangodeckError, calculatePower } = require("../utils/dangodeck");
const { cardGame, CardGameError } = require("../utils/cardGame");
const { economyFields, requireGameChannel } = require("../utils/cardGameUI");

const COLORS = {
    Neutral: "#A8A8A8",
    Fire: "#E74C3C",
    Water: "#3498DB",
    Electric: "#F1C40F",
    Light: "#F5E6A8",
    Dark: "#34495E",
    default: "#2ECC71",
};

function titleCase(value) {
    return String(value || "-")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statsText(stats) {
    if (!stats) return "Stats tidak tersedia.";
    return [
        `HP: **${stats.hp ?? "-"}**`,
        `ATK: **${stats.atk ?? "-"}**`,
        `DEF: **${stats.def ?? "-"}**`,
        `SPD: **${stats.spd ?? "-"}**`,
    ].join("\n");
}

function cardEmbed(card, requestedBy, heading = "Card Detail") {
    const params = card.params || {};
    const embed = new EmbedBuilder()
        .setColor(COLORS[card.element] || COLORS.default)
        .setTitle(`${heading}: ${card.name || `#${card.id}`}`)
        .setDescription(`**Anime:** ${card.anime || "-"}\n**Element:** ${card.element || "-"}\n**Card ID:** ${card.id || "-"}`)
        .addFields({ name: "Stats", value: statsText(card.stats), inline: true })
        .setFooter({ text: `Requested by ${requestedBy} | Powered by Dangodeck` })
        .setTimestamp();

    if (card.image) embed.setImage(card.image);
    if (params.rarity) {
        embed.addFields({
            name: "Progression",
            value: `Rarity: **${titleCase(params.rarity)}**\nLevel: **${params.level}**\nEvo: **${params.evo}**\nAscension: **${params.ascension}**`,
            inline: true,
        });
    }
    if (card.power !== undefined) {
        embed.addFields({ name: "Power", value: `**${card.power.toLocaleString("id-ID")}**`, inline: true });
    } else if (card.stats) {
        embed.addFields({ name: "Base Power", value: `**${calculatePower(card.stats).toLocaleString("id-ID")}**`, inline: true });
    }
    if (card.talent?.name) {
        const description = String(card.talent.description || "-");
        embed.addFields({
            name: `Talent: ${card.talent.name}`,
            value: description.length > 500 ? `${description.slice(0, 497)}...` : description,
        });
    }
    return embed;
}

function parseKeyValues(args) {
    let currentKey;
    return args.reduce((result, arg) => {
        const separator = arg.indexOf("=");
        if (separator > 0) {
            currentKey = arg.slice(0, separator).toLowerCase();
            result[currentKey] = arg.slice(separator + 1);
        } else if (currentKey) {
            result[currentKey] = `${result[currentKey]} ${arg}`.trim();
        }
        return result;
    }, {});
}

function cardsListEmbed(result, requestedBy) {
    const cards = result.items || result;
    const description = cards.length
        ? cards.map((card) => `**#${card.id} ${card.name}** | ${card.anime || "-"} | ${card.element || "-"}`).join("\n")
        : "Tidak ada kartu yang ditemukan.";
    const embed = new EmbedBuilder()
        .setColor(COLORS.default)
        .setTitle("Dangodeck Card List")
        .setDescription(description.slice(0, 4000))
        .setFooter({ text: `Requested by ${requestedBy} | Powered by Dangodeck` })
        .setTimestamp();

    if (result.page) {
        embed.addFields({
            name: "Page",
            value: `${result.page}/${result.totalPages} (${result.total} cards)`,
        });
    }
    return embed;
}

function usage(prefix) {
    return [
        `\`${prefix}card random\``,
        `\`${prefix}card detail <id>\``,
        `\`${prefix}card stats <id> rarity=ultra_rare level=100 evo=3 ascension=5\``,
        `\`${prefix}card search <nama> [limit=20]\``,
        `\`${prefix}card list page=1 limit=20 element=Water anime=...\``,
    ].join("\n");
}

module.exports = {
    name: "card",
    alias: ["cards", "kartu", "gacha", "pull"],
    description: "Gacha, cari, dan lihat stats kartu dari Dangodeck",

    run: async (client, message, args) => {
        const prefix = process.env.PREFIX || "!";
        const action = String(args.shift() || "random").toLowerCase();

        try {
            requireGameChannel(message);
            await message.channel.sendTyping();

            if (["random", "gacha", "pull"].includes(action)) {
                const player = cardGame.getPlayer(message.guild.id, message.author.id);
                if (player.tickets < 1) throw new CardGameError("Ticket gacha habis. Ambil `!daily` terlebih dahulu.");
                const card = await dangodeck.getRandomCard();
                const instance = cardGame.addCard(message.guild.id, message.author.id, card);
                const embed = cardEmbed(card, message.author.tag, "Gacha Pull")
                    .addFields(
                        { name: "Inventory ID", value: `\`${instance.instanceId}\``, inline: true },
                        ...economyFields(player)
                    );
                return message.reply({ embeds: [embed] });
            }

            if (["detail", "show", "view"].includes(action)) {
                const card = await dangodeck.getCard(args[0]);
                return message.reply({ embeds: [cardEmbed(card, message.author.tag)] });
            }

            if (["stats", "power"].includes(action)) {
                const id = args.shift();
                const options = parseKeyValues(args);
                const card = await dangodeck.getCardStats(id, options);
                return message.reply({ embeds: [cardEmbed(card, message.author.tag, "Card Stats")] });
            }

            if (["search", "find", "cari"].includes(action)) {
                const options = parseKeyValues(args);
                const query = args.filter((arg) => !arg.includes("=")).join(" ");
                const cards = await dangodeck.searchCards(query, options.limit || 20);
                return message.reply({ embeds: [cardsListEmbed(cards, message.author.tag)] });
            }

            if (["list", "browse"].includes(action)) {
                const result = await dangodeck.listCards(parseKeyValues(args));
                return message.reply({ embeds: [cardsListEmbed(result, message.author.tag)] });
            }

            return message.reply(`Subcommand tidak dikenal.\n\n${usage(prefix)}`);
        } catch (error) {
            const messageText = error instanceof DangodeckError || error instanceof CardGameError
                ? error.message
                : "Terjadi kesalahan saat memproses data kartu.";
            console.error("Dangodeck card command error:", error);
            return message.reply(`Gagal mengambil kartu: ${messageText}\n\n${usage(prefix)}`);
        }
    },
};
