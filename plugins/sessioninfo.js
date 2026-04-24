const { getSessionLength, sessionsEnabled, buildSessionKey } = require("../utils/aiHelper");

module.exports = {
    name: "sessioninfo",
    description: "Cek jumlah history AI per user",
    alias: ["session", "history", "sessioncount", "sesi"],
    run: async (client, message) => {
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
