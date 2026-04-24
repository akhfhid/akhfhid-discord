const { resetSession, buildSessionKey } = require("../utils/aiHelper");

module.exports = {
    name: "sessionreset",
    description: "Reset AI session untuk kamu atau user yang di-mention (admin only)",
    alias: ["resetsession", "resetai", "aireset"],
    run: async (client, message) => {
        const mentioned = message.mentions.users.first() || null;
        const isAdmin = message.member?.permissions?.has("Administrator") ||
            message.member?.permissions?.has("ManageGuild");

        if (mentioned && !isAdmin) {
            await message.reply("Kamu hanya bisa reset session kamu sendiri.");
            return;
        }

        const targetUser = mentioned || message.author;
        const sessionKey = buildSessionKey(targetUser.id, message.guild?.id, "chat");
        const removedCount = resetSession(sessionKey);
        const turnCount = Math.ceil(removedCount / 2);

        await message.reply(
            `Session AI untuk ${targetUser.username} di server ini direset. ` +
            `History terhapus: ${removedCount} pesan (${turnCount} turn).`
        );
    },
};
