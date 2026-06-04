const { cardGame } = require("../utils/cardGame");
const { baseEmbed, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

function marketHelp(prefix) {
    return `Gunakan \`${prefix}market sell <inventory-id> <harga>\`, \`${prefix}market buy <listing-id>\`, atau \`${prefix}market cancel <listing-id>\`.`;
}

module.exports = {
    name: "market",
    alias: ["marketplace", "trade"],
    description: "Jual dan beli kartu dengan pemain satu server",
    run: async (client, message, args) => {
        const prefix = process.env.PREFIX || "!";
        try {
            requireGameChannel(message);
            const action = String(args.shift() || "list").toLowerCase();
            if (action === "sell") {
                const listing = cardGame.sell(message.guild.id, message.author.id, args[0], args[1]);
                return message.reply(`Kartu **${listing.card.name}** masuk market dengan listing ID \`${listing.listingId}\` seharga **${listing.price.toLocaleString("id-ID")} gold**.`);
            }
            if (action === "buy") {
                const listing = cardGame.buy(message.guild.id, message.author.id, args[0]);
                return message.reply(`Berhasil membeli **${listing.card.name}** seharga **${listing.price.toLocaleString("id-ID")} gold**.`);
            }
            if (action === "cancel") {
                const listing = cardGame.cancelListing(message.guild.id, message.author.id, args[0]);
                return message.reply(`Listing **${listing.card.name}** dibatalkan dan kartu kembali ke inventory.`);
            }
            if (!["list", "browse"].includes(action)) return message.reply(marketHelp(prefix));

            const listings = cardGame.listMarket(message.guild.id);
            const description = listings.length
                ? listings.slice(0, 25).map((listing) =>
                    `\`${listing.listingId}\` ${formatCard(listing.card)}\nHarga: **${listing.price.toLocaleString("id-ID")} gold** | Penjual: <@${listing.sellerId}>`
                ).join("\n\n")
                : `Market masih kosong.\n\n${marketHelp(prefix)}`;
            return message.reply({ embeds: [baseEmbed("Card Marketplace", message.author.tag).setDescription(description.slice(0, 4000))] });
        } catch (error) {
            return message.reply(`${errorMessage(error)}\n${marketHelp(prefix)}`);
        }
    },
};
