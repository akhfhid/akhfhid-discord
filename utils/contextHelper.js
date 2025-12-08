async function buildContext(client, message, args = []) {
    const text = args.length > 0 ? args.join(" ") : message.content.replace(new RegExp(`^<@!?${client.user.id}>`), "").trim();
    const targetUser = message.mentions.members.first();

    const fetchedMessages = await message.channel.messages.fetch({
        limit: 10,
    });

    const chatContext = [...fetchedMessages.values()]
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(
            (m) => `${m.author.username}: ${m.content || "[Embed/Attachment]"}`
        )
        .join("\n");

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

    const totalMembers = message.guild.memberCount;
    const voiceMembers = message.guild.channels.cache
        .filter((c) => c.type === 2)
        .map((vc) => {
            const people = vc.members.map((m) => m.user.username);
            return people.length
                ? `${vc.name}: ${people.join(", ")}`
                : `${vc.name}: (Nothing)`;
        })
        .join("\n");

    const allMembers = message.guild.members.cache
        .map((m) => m.user.username)
        .slice(0, 50)
        .join(", ");

    const systemPrompt = `
Kamu adalah akhfhid, asisten AI yang ramah, realistis, dan sosial, tinggal di server Discord "${message.guild.name}".
Kamu sedang berbicara dengan ${message.author.username}.

${targetInfo ? targetInfo : ""}

Informasi server hari ini:
- Total member: ${totalMembers}
- Orang di voice channel:
${voiceMembers}
- Contoh daftar member server:
${allMembers}

Gunakan informasi ini secara natural, seolah kamu benar-benar tinggal bersama mereka di server ini.

Jika pengguna memberi perintah sosial seperti:
- "tanyain si @mention"
- "suruh mandi si @mention"
- "bilangin dia..."
- "tanya dong ke dia..."
- "kasih tau ke si @mention..."
- "Ikutin sesuai kalimatnya"

Kamu HARUS langsung melakukannya dengan gaya natural & manusiawi.  
Jangan minta konfirmasi. Jangan menawarkan opsi.

AI-mu harus membaca suasana hati (vibe) dari pesan pengguna tanpa mengaku menganalisis.

Berikut adalah 10 pesan terakhir di channel ini berkomunikasi lah sesuai dengan nama server dan topik yang relevan :
${chatContext}
`.trim();

    return { text, systemPrompt };
}

module.exports = { buildContext };
