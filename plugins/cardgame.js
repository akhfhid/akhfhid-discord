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
                    `\`${prefix}gacha\` - Gacha kartu random.\n` +
                    `  🎟️ **Gratis 1x/hari:** Gunakan 1 ticket (dari daily).\n` +
                    `  💰 **Premium:** Gunakan 200 gold untuk gacha unlimited.\n` +
                    `\`${prefix}inventory\` - Lihat koleksi, inventory ID, progression, dan power kartu.`,
            },
            {
                name: "Upgrade Kartu",
                value:
                    `\`${prefix}upgrade <inventory-id> [jumlah-level]\` - Naikkan level kartu menggunakan gold dan material. Maksimal 10 level sekali upgrade.\n` +
                    `Contoh: \`${prefix}upgrade a1b2c3d4 5\`\n` +
                    `**Biaya:** Gold = (level saat ini) × 25 per level | Material = 10 per level\n` +
                    `Contoh: Lv 50→51 = 50×25 = 1.250 gold + 10 material\n\n` +
                    `\`${prefix}evolve <inventory-id>\` - Naikkan evo kartu sampai Evo 3. Membutuhkan level 30 lalu 70.\n` +
                    `\`${prefix}ascend <inventory-id>\` - Naikkan ascension sampai 5. Membutuhkan minimal level 50.`,
            },
            {
                name: "Battle dan Raid",
                value:
                    `\`${prefix}battle @user\` - Duel kartu dengan dialog AI! Narasi AI menjelaskan alasan menang/kalah. Pemenang +300 gold, +20 material. Cooldown 5 menit.\n` +
                    `\`${prefix}raid\` - Serang boss bersama dengan kartu terkuat. Cooldown antaran 15 detik. Notif otomatis jam 19:30 WIB.\n` +
                    "**Difficulty Raid:** Easy (30K) | Normal (50K) | Hard (75K). Notif raid dimulai jam **19:30 WIB**, boss spawn jam **20:00 WIB** setiap hari.",
            },
            {
                name: "Marketplace",
                value:
                    `\`${prefix}market list\` - Lihat semua kartu dengan detail stat, level, power, gambar.\n` +
                    `\`${prefix}market sell <id> <harga>\` - Jual kartu dengan harga custom.\n` +
                    `\`${prefix}market quick <id> [harga]\` - Jual cepat (harga otomatis atau custom).\n` +
                    `\`${prefix}market buy <id>\` - Beli kartu pemain lain.\n` +
                    `\`${prefix}market cancel <id>\` - Batalkan listing milikmu.\n` +
                    "Penjual menerima 95% harga. Market list ada pagination ⬅️➡️",
            },
            {
                name: "Database Dangodeck",
                value:
                    `\`${prefix}card detail <card-id>\` - Lihat detail kartu Dangodeck.\n` +
                    `\`${prefix}card stats <card-id> rarity=rare level=50 evo=2 ascension=1\` - Simulasikan stats dan power.\n` +
                    `\`${prefix}card search <nama>\` - Cari kartu berdasarkan nama.\n` +
                    `\`${prefix}card list page=1 limit=20\` - Jelajahi database kartu (dengan pagination ⬅️➡️)`,
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
            return message.reply(`Dangodeck Card Game ditambahkan di ${target}. Channel card game lain di server ini tetap aktif.`);
        }
        if (sub === "disable") {
            if (!isAdmin) return message.reply("Hanya admin yang bisa menonaktifkan card game.");
            const target = message.mentions.channels.first() ||
                (String(args[1] || "").toLowerCase() === "all" ? null : message.channel);
            cardGame.disableChannel(message.guild.id, target?.id);
            return message.reply(target
                ? `Dangodeck Card Game dinonaktifkan di ${target}.`
                : "Dangodeck Card Game dinonaktifkan di semua channel server ini.");
        }
        if (sub === "status") {
            const channelIds = cardGame.getChannelIds(message.guild.id);
            return message.reply(channelIds.length
                ? `Dangodeck Card Game aktif di ${channelIds.map((id) => `<#${id}>`).join(", ")}.`
                : `Card game belum aktif. Gunakan \`${prefix}cardgame set #channel\`.`);
        }
        if (["panel", "guide", "tutorial", "tutor"].includes(sub)) {
            if (!isAdmin) return message.reply("Hanya admin yang bisa mengirim ulang panel card game.");
            const target = message.mentions.channels.first() ||
                (cardGame.getChannelIds(message.guild.id).includes(message.channel.id) ? message.channel : null) ||
                message.guild.channels.cache.get(cardGame.getChannelId(message.guild.id));
            if (!target) return message.reply(`Aktifkan channel dahulu dengan \`${prefix}cardgame set #channel\`.`);
            await sendGuide(target, prefix, message.author.tag);
            return message.reply(`Panel panduan card game dikirim ke ${target}.`);
        }

        return message.reply({ embeds: [buildGuideEmbed(prefix, message.author.tag)] });
    },
};
