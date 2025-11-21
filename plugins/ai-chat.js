const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const akhfhid = process.env.BASE_API;

module.exports = {
  name: "ai",
  alias: ["gpt", "chat"],
  description: "Chat with Akhfhid AI",

  run: async (client, message, args) => {
    if (!args.length) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#FF5733")
        .setTitle("Wrong Usage!")
        .setDescription("Send a message after the command !")
        .addFields({
          name: "Example",
          value: `\`${process.env.PREFIX || "!"}ai hai perkenalkan dirimu \``,
        });
      return message.reply({ embeds: [errorEmbed] });
    }

    try {
      const loadingEmbed = new EmbedBuilder()
        .setColor("#FFCC00")
        .setAuthor({
          name: "Akhfhid AI",
          iconURL: client.user.displayAvatarURL(),
        })
        .addFields(
          { name: "Duration", value: "0 seconds", inline: true },
          { name: "Status", value: `Connecting...`, inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

      let seconds = 0;
      const timer = setInterval(() => {
        seconds++;
        const updated = EmbedBuilder.from(loadingEmbed)
          .setFields(
            { name: "Duration", value: `${seconds} seconds`, inline: true },
            { name: "Status", value: `Processing Answer...`, inline: true }
          )
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp();
        loadingMsg.edit({ embeds: [updated] }).catch(() => {});
      }, 1000);

      const text = args.join(" ");
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
Tentang user yang kamu sebut (${targetUser.user.username}):
- Nama/Nickname: ${nickname}
- Tanggal join: ${joinDate}
- Roles: ${roles.length ? roles.join(", ") : "Tidak punya role khusus"}
`.trim();
      }

      const totalMembers = message.guild.memberCount;
      const voiceMembers = message.guild.channels.cache
        .filter((c) => c.type === 2) // voice channels
        .map((vc) => {
          const people = vc.members.map((m) => m.user.username);
          return people.length
            ? `${vc.name}: ${people.join(", ")}`
            : `${vc.name}: (kosong)`;
        })
        .join("\n");
      const allMembers = message.guild.members.cache
        .map((m) => m.user.username)
        .slice(0, 50) // batas biar tidak terlalu panjang
        .join(", ");
      const systemPrompt = `
Kamu adalah akhfhid, asisten AI yang ramah, realistis, dan sosial, tinggal di server Discord "${
        message.guild.name
      }".
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

      const data = {
        text: text,
        systemPrompt: systemPrompt,
        sessionId: message.author.id,
      };

      const response = await axios.post(`${akhfhid}/ai/gpt/5-nano`, data, {
        headers: { "Content-Type": "application/json" },
      });

      clearInterval(timer);
      await loadingMsg.delete();

      const resultEmbed = new EmbedBuilder()
        .setColor("#0099FF")
        .setAuthor({
          name: "Akhfhid AI",
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(response.data.result)
        .addFields(
          { name: "👤 Asking by", value: message.author.tag, inline: true },
          {
            name: "⏱️ Response Time",
            value: response.data.responseTime,
            inline: true,
          },
          { name: "🌐 Server", value: message.guild.name, inline: true }
        )
        .setFooter({ text: `requested by ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [resultEmbed] });
    } catch (error) {
      console.error("Error saat memanggil API AI:", error);

      try {
        clearInterval(timer);
        if (loadingMsg) await loadingMsg.delete();
      } catch {}

      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription("Maaf Fan, aku lagi error nih. Coba sebentar lagi ya.")
        .setFooter({ text: "Jika masalah berlanjut, hubungi administrator." });

      await message.reply({ embeds: [errorEmbed] });
    }
  },
};
