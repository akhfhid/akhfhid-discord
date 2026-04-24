async function buildContext(client, message, args = []) {
    const text = args.length > 0 ? args.join(" ") : message.content.replace(new RegExp(`^<@!?${client.user.id}>`), "").trim();
    const targetUser = message.guild ? message.mentions.members.first() : null;
    let chatContext = "";
    try {
        const fetchedMessages = await message.channel.messages.fetch({
            limit: 10,
        });
        chatContext = [...fetchedMessages.values()]
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .map(
                (m) => `${m.author.username}: ${m.content || "[Embed/Attachment]"}`
            )
            .join("\n");
    } catch {
        chatContext = "(Riwayat chat tidak tersedia di channel ini)";
    }

    let targetInfo = "";

    if (targetUser) {
        const nickname = targetUser.nickname || targetUser.user.username;
        const joinDate =
            targetUser.joinedAt?.toLocaleDateString() || "Tidak diketahui";

        const roles = targetUser.roles.cache
            .filter((role) => role.name !== "@everyone")
            .map((role) => role.name);

        targetInfo = `
About user you mention (${targetUser.user.username}):
- Name/Nickname: ${nickname}
- Join Date: ${joinDate}
- Roles: ${roles.length ? roles.join(", ") : "Tidak punya role khusus"}
`.trim();
    }

    const guildName = message.guild?.name || "Direct Message";
    const totalMembers = message.guild?.memberCount || 0;
    const voiceMembers = message.guild
        ? message.guild.channels.cache
            .filter((c) => c.isVoiceBased())
            .map((vc) => {
                const people = vc.members.map((m) => m.user.username);
                return people.length
                    ? `- ${vc.name}: ${people.join(", ")}`
                    : `- ${vc.name}: (Kosong)`;
            })
            .join("\n")
        : "- Tidak tersedia (DM)";

    const memberDirectory = message.guild
        ? message.guild.members.cache
            .map((m) => {
                const nick = m.nickname ? ` | nick: ${m.nickname}` : "";
                return `- ${m.user.username} | id: ${m.user.id}${nick}`;
            })
            .slice(0, 50)
            .join("\n")
        : "- Tidak tersedia (DM)";

    const creatorDiscordId = process.env.BOT_CREATOR_ID || "870115369174564914";

    const systemPrompt = `
Kamu adalah akhfhid, asisten AI yang ramah, realistis, dan sosial, tinggal di server Discord "${guildName}".
Kamu sedang berbicara dengan ${message.author.username}.

Identity penting bot:
- Pembuat/creator bot ini adalah user Discord dengan ID: ${creatorDiscordId}
- Jika ada yang bertanya siapa pembuat bot, jawab konsisten pakai ID tersebut dan mention sebagai <@${creatorDiscordId}>.

${targetInfo ? targetInfo : ""}

Informasi server hari ini:
- Total member: ${totalMembers}
- Orang di voice channel:
${voiceMembers || "- Tidak ada data voice"}
- Direktori member (pakai ini untuk mention yang valid):
${memberDirectory || "- Tidak ada data member"}

Gunakan informasi ini secara natural, seolah kamu benar-benar tinggal bersama mereka di server ini.

PENTING: Jika pengguna meminta informasi kontak publik (seperti nomor HP kost, bisnis, toko, atau layanan umum), KAMU DIIZINKAN dan HARUS memberikannya jika ada dalam hasil pencarian atau pengetahuanmu.
- Jangan menolak dengan alasan privasi untuk data bisnis/publik.
- Jika diminta mencarikan kost/tempat usaha, sertakan nomor kontak yang bisa dihubungi agar membantu pengguna.

Jika pengguna memberi perintah sosial seperti:
- "tanyain si @mention"
- "suruh mandi si @mention"
- "bilangin dia..."
- "tanya dong ke dia..."
- "kasih tau ke si @mention..."
- "Ikutin sesuai kalimatnya"

Kamu HARUS langsung melakukannya dengan gaya natural & manusiawi.  
Jangan minta konfirmasi. Jangan menawarkan opsi.

RULE MENTION WAJIB:
- Jangan pakai format @username biasa karena sering tidak menandai user.
- Jika ingin memanggil user, WAJIB gunakan mention Discord dengan format <@USER_ID>.
- Pilih USER_ID dari direktori member di atas atau dari user yang disebut pengguna.

AI-mu harus membaca suasana hati (vibe) dari pesan pengguna tanpa mengaku menganalisis.

Berikut adalah 10 pesan terakhir di channel ini berkomunikasi lah sesuai dengan nama server dan topik yang relevan :
${chatContext}
`.trim();

    return { text, systemPrompt };
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function convertAtUsernamesToMentions(text, guild) {
    if (!text || !guild) return text;

    const members = Array.from(guild.members.cache.values());
    let updated = String(text);

    for (const member of members) {
        const mention = `<@${member.user.id}>`;
        const aliases = [member.user.username];
        if (member.nickname) aliases.push(member.nickname);
        if (member.displayName && !aliases.includes(member.displayName)) {
            aliases.push(member.displayName);
        }

        for (const alias of aliases) {
            const clean = String(alias || "").trim();
            if (!clean || clean.length < 2) continue;
            const pattern = new RegExp(`(^|\\s)@${escapeRegex(clean)}(?=\\s|$|[.,!?])`, "gi");
            updated = updated.replace(pattern, (full, startSpace) => `${startSpace}${mention}`);
        }
    }

    return updated;
}

module.exports = { buildContext, convertAtUsernamesToMentions };
