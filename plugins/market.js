const { cardGame } = require("../utils/cardGame");
const { baseEmbed, errorMessage, formatCard, requireGameChannel } = require("../utils/cardGameUI");

function marketHelp(prefix) {
    return `\`${prefix}market list\` - Lihat semua kartu dijual\n\`${prefix}market sell <id> <harga>\` - Jual kartu\n\`${prefix}market quick <id> [harga]\` - Jual cepat\n\`${prefix}market buy <id>\` - Beli kartu\n\`${prefix}market cancel <id>\` - Batalkan listing`;
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
                return message.reply(`✅ Kartu **${listing.card.name}** masuk market dengan listing ID \`${listing.listingId}\` seharga **${listing.price.toLocaleString("id-ID")} gold**.`);
            }
            
            if (action === "quick") {
                // Quick sell dengan harga otomatis atau user tentukan
                const player = cardGame.getPlayer(message.guild.id, message.author.id);
                const card = cardGame.findCard(message.guild.id, message.author.id, args[0]);
                
                // Hitung harga otomatis berdasarkan rarity dan level
                const rarityMult = { base: 100, common: 300, uncommon: 700, rare: 1500, super_rare: 3500, ultra_rare: 7500 };
                const basePricePerRarity = rarityMult[card.rarity] || 500;
                const levelMult = 1 + (card.level / 100) * 0.5;
                const autoPrice = Math.round(basePricePerRarity * levelMult);
                
                const finalPrice = args[1] ? Number(args[1]) : autoPrice;
                
                if (!Number.isInteger(finalPrice) || finalPrice < 100 || finalPrice > 10_000_000) {
                    return message.reply("❌ Harga harus 100-10.000.000 gold!");
                }
                
                const listing = cardGame.sell(message.guild.id, message.author.id, args[0], finalPrice);
                return message.reply(`⚡ **Quick Sell!** ${formatCard(listing.card)} dijual seharga **${listing.price.toLocaleString("id-ID")} gold** (otomatis harga: ${autoPrice.toLocaleString("id-ID")})`);
            }
            
            if (action === "buy") {
                const listing = cardGame.buy(message.guild.id, message.author.id, args[0]);
                return message.reply(`✅ Berhasil membeli **${listing.card.name}** seharga **${listing.price.toLocaleString("id-ID")} gold**.`);
            }
            
            if (action === "cancel") {
                const listing = cardGame.cancelListing(message.guild.id, message.author.id, args[0]);
                return message.reply(`❌ Listing **${listing.card.name}** dibatalkan dan kartu kembali ke inventory.`);
            }
            
            if (!["list", "browse"].includes(action)) return message.reply(marketHelp(prefix));

            const listings = cardGame.listMarket(message.guild.id);
            if (!listings.length) {
                return message.reply({ embeds: [baseEmbed("🏪 Card Marketplace", message.author.tag).setDescription(`Market masih kosong.\n\n${marketHelp(prefix)}`)] });
            }
            
            const itemsPerPage = 4;
            const pages = Math.ceil(listings.length / itemsPerPage);
            let currentPage = 1;
            
            const generateEmbed = async (page) => {
                const start = (page - 1) * itemsPerPage;
                const end = start + itemsPerPage;
                const pageListings = listings.slice(start, end);
                
                const fields = [];
                for (const listing of pageListings) {
                    const stats = await cardGame.hydrateCard(listing.card);
                    const priceDisplay = listing.price.toLocaleString("id-ID");
                    fields.push({
                        name: `🛍️ [${listing.listingId}] ${listing.card.name}`,
                        value: `**Anime:** ${listing.card.anime} | **Element:** ${listing.card.element}\n` +
                               `**Rarity:** ${listing.card.rarity} | **Level:** ${listing.card.level} | **Evo:** ${listing.card.evo}\n` +
                               `**Ascension:** ${listing.card.ascension} | **Power:** ${stats.power.toLocaleString("id-ID")}\n` +
                               `**Harga:** ${priceDisplay} gold | **Penjual:** <@${listing.sellerId}>`,
                        inline: false
                    });
                }
                
                const embed = baseEmbed("🏪 Card Marketplace", message.author.tag)
                    .setDescription(`Total listing: **${listings.length}** kartu\n📄 Halaman ${page} dari ${pages}`)
                    .addFields(...fields);
                
                if (pageListings[0]?.card.image) {
                    embed.setImage(pageListings[0].card.image);
                }
                
                return embed;
            };
            
            const reply = await message.reply({ embeds: [await generateEmbed(currentPage)] });
            
            if (pages > 1) {
                await reply.react("⬅️");
                await reply.react("➡️");
                
                const filter = (reaction, user) => ["⬅️", "➡️"].includes(reaction.emoji.name) && user.id === message.author.id;
                const collector = reply.createReactionCollector({ filter, time: 300000 });
                
                collector.on("collect", async (reaction) => {
                    if (reaction.emoji.name === "➡️" && currentPage < pages) {
                        currentPage++;
                    } else if (reaction.emoji.name === "⬅️" && currentPage > 1) {
                        currentPage--;
                    }
                    await reply.edit({ embeds: [await generateEmbed(currentPage)] });
                    try { await reaction.users.remove(message.author.id); } catch (e) {}
                });
            }
            return;
        } catch (error) {
            return message.reply(`${errorMessage(error)}\n${marketHelp(prefix)}`);
        }
    },
};
