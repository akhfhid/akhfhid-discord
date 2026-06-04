const { PermissionFlagsBits } = require("discord.js");
const { cardGame } = require("../utils/cardGame");
const { baseEmbed } = require("../utils/cardGameUI");

function buildGuideEmbed(prefix, requestedBy) {
    return baseEmbed("Dangodeck Card Game - Panduan Bermain", requestedBy)
        .setDescription(
            "Selamat datang di Dangodeck Card Game!\n" +
            "Semua command kartu hanya dapat digunakan di channel ini.\n\n" +
            "**Modal pemain baru:** 1.000 gold, 5 ticket gacha, dan 100 material."
        )
        .addFields(
            {
                name: "Mulai Bermain",
                value:
                    `\`${prefix}daily\` - Ambil gold, ticket, dan material setiap 24 jam.\n` +
                    `\`${prefix}gacha\` - Gunakan 1 ticket untuk mendapatkan kartu random.\n` +
                    `\`${prefix}inventory\` - Lihat koleksi, inventory ID, progression, dan power kartu.`,
            },
            {
                name: "Upgrade Kartu",
                value:
                    `\`${prefix}upgrade <inventory-id> [jumlah-level]\` - Naikkan level kartu menggunakan gold dan material. Maksimal 10 level sekali upgrade.\n` +
                    `Contoh: \`${prefix}upgrade a1b2c3d4 5\`\n\n` +
                    `\`${prefix}evolve <inventory-id>\` - Naikkan evo kartu sampai Evo 3. Membutuhkan level 30 lalu 70.\n` +
                    `\`${prefix}ascend <inventory-id>\` - Naikkan ascension sampai 5. Membutuhkan minimal level 50.`,
            },
            {
                name: "Battle dan Raid",
                value:
                    `\`${prefix}battle @user\` - Duel melawan kartu terkuat pemain lain. Pemenang mendapat gold dan material. Cooldown 5 menit.\n` +
                    `\`${prefix}raid\` - Serang boss bersama pemain satu server menggunakan kartu terkuat. Cooldown serangan 1 menit.`,
            },
            {
                name: "Marketplace",
                value:
                    `\`${prefix}market\` - Lihat kartu yang dijual.\n` +
                    `\`${prefix}market sell <inventory-id> <harga>\` - Jual kartu.\n` +
                    `\`${prefix}market buy <listing-id>\` - Beli kartu pemain lain.\n` +
                    `\`${prefix}market cancel <listing-id>\` - Batalkan listing milikmu.\n` +
                    "Penjual menerima 95% harga setelah kartu terjual.",
            },
            {
                name: "Database Dangodeck",
                value:
                    `\`${prefix}card detail <card-id>\` - Lihat detail kartu Dangodeck.\n` +
                    `\`${prefix}card stats <card-id> rarity=rare level=50 evo=2 ascension=1\` - Simulasikan stats dan power.\n` +
                    `\`${prefix}card search <nama>\` - Cari kartu berdasarkan nama.\n` +
                    `\`${prefix}card list page=1 limit=20\` - Jelajahi database kartu.`,
            },
            {
                name: "Tips",
                value:
                    "Gunakan **inventory ID** dari `!inventory` untuk upgrade, evolve, ascend, dan menjual kartu. " +
                    "Card ID Dangodeck berbeda dari inventory ID milik pemain.",
            }
        );
}

async function sendGuide(channel, prefix, requestedBy) {
    return channel.send({ embeds: [buildGuideEmbed(prefix, requestedBy)] });
}

module.exports = {
    name: "cardgame",
    alias: ["cg", "cardsetup"],
    description: "Aktifkan dan lihat panduan Dangodeck Card Game",
    run: async (client, message, args) => {
        if (!message.guild) return message.reply("Command ini hanya bisa dipakai di server.");
        const prefix = process.env.PREFIX || "!";
        const sub = String(args[0] || "help").toLowerCase();
        const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
            message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);

        if (["set", "setchannel", "channel"].includes(sub)) {
            if (!isAdmin) return message.reply("Hanya admin yang bisa mengaktifkan card game.");
            const target = message.mentions.channels.first() ||
                (String(args[1] || "").toLowerCase() === "here" ? message.channel : null);
            if (!target) return message.reply(`Gunakan \`${prefix}cardgame set #channel\` atau \`${prefix}cardgame set here\`.`);
            cardGame.setChannel(message.guild.id, target.id);
            try {
                await sendGuide(target, prefix, message.author.tag);
            } catch (error) {
                console.error("Failed to send card game guide:", error?.message || error);
                return message.reply(
                    `Dangodeck Card Game aktif di ${target}, tetapi bot gagal mengirim panduan. ` +
                    `Pastikan bot memiliki izin Send Messages dan Embed Links, lalu gunakan \`${prefix}cardgame panel\`.`
                );
            }
            return message.reply(`Dangodeck Card Game aktif di ${target}. Panel panduan command sudah dikirim ke channel tersebut.`);
        }
        if (sub === "disable") {
            if (!isAdmin) return message.reply("Hanya admin yang bisa menonaktifkan card game.");
            cardGame.disableChannel(message.guild.id);
            return message.reply("Dangodeck Card Game dinonaktifkan.");
        }
        if (sub === "status") {
            const channelId = cardGame.getChannelId(message.guild.id);
            return message.reply(channelId ? `Dangodeck Card Game aktif di <#${channelId}>.` : `Card game belum aktif. Gunakan \`${prefix}cardgame set #channel\`.`);
        }
        if (["panel", "guide", "tutorial", "tutor"].includes(sub)) {
            if (!isAdmin) return message.reply("Hanya admin yang bisa mengirim ulang panel card game.");
            const channelId = cardGame.getChannelId(message.guild.id);
            const target = message.mentions.channels.first() ||
                (channelId ? message.guild.channels.cache.get(channelId) : null);
            if (!target) return message.reply(`Aktifkan channel dahulu dengan \`${prefix}cardgame set #channel\`.`);
            await sendGuide(target, prefix, message.author.tag);
            return message.reply(`Panel panduan card game dikirim ke ${target}.`);
        }

        return message.reply({ embeds: [buildGuideEmbed(prefix, message.author.tag)] });
    },
};
