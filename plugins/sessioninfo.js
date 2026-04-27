const { getSessionLength, sessionsEnabled, buildSessionKey } = require("../utils/aiHelper");

module.exports = {
    name: "sessioninfo",
    description: "Cek jumlah history AI per user",
    alias: ["session", "history", "sessioncount", "sesi"],
    run: async (client, message, args) => {
        const sub = String(args?.[0] || "").toLowerCase();
        const prefix = process.env.PREFIX || "!";

        if (["tutor", "tutorial", "help", "panduan"].includes(sub)) {
            await message.reply(
                "**Tutorial Session AI**\n" +
                `1. Cek jumlah history kamu: \`${prefix}session\`\n` +
                `2. Cek history user lain (admin): \`${prefix}session @user\`\n` +
                `3. Reset history kamu: \`${prefix}sessionreset\`\n` +
                `4. Reset history user lain (admin): \`${prefix}sessionreset @user\`\n\n` +
                "Catatan:\n" +
                "• Session menyimpan konteks chat AI per user per server.\n" +
                "• Semakin panjang session, AI biasanya makin nyambung konteksnya.\n" +
                "• Reset dipakai kalau mau mulai konteks baru dari nol."
            );
            return;
        }

        if (!sessionsEnabled()) {
            await message.reply("Session AI sedang nonaktif.");
            return;
        }

        const mentioned = message.mentions.users.first() || null;
        const isAdmin = message.member?.permissions?.has("Administrator") ||
            message.member?.permissions?.has("ManageGuild");

        if (mentioned && !isAdmin) {
            await message.reply("Kamu hanya bisa cek history kamu sendiri.");
            return;
        }

        const targetUser = mentioned || message.author;
        const sessionKey = buildSessionKey(targetUser.id, message.guild?.id, "chat");
        const messageCount = getSessionLength(sessionKey);
        const turnCount = Math.ceil(messageCount / 2);

        await message.reply(
            `History AI untuk ${targetUser.username} di server ini: ${messageCount} pesan (${turnCount} turn).`
        );
    },
};
