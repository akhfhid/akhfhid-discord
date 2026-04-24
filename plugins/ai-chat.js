const { generateText, buildSessionKey } = require("../utils/aiHelper");
const { buildContext, convertAtUsernamesToMentions } = require("../utils/contextHelper");
const { EmbedBuilder } = require("discord.js");

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
          value: `\`${process.env.PREFIX || "!"}chat introduce urself \``,
        });
      return message.reply({ embeds: [errorEmbed] });
    }

    let loadingMsg;
    let timer;

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

      loadingMsg = await message.reply({ embeds: [loadingEmbed] });

      let seconds = 0;
      timer = setInterval(() => {
        seconds++;
        const updated = EmbedBuilder.from(loadingEmbed)
          .setFields(
            { name: "Duration", value: `${seconds} seconds`, inline: true },
            { name: "Status", value: `Processing Answer...`, inline: true }
          )
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp();
        loadingMsg.edit({ embeds: [updated] }).catch(() => { });
      }, 1000);

      const { text, systemPrompt } = await buildContext(client, message, args);

      const sessionKey = buildSessionKey(message.author.id, message.guild?.id, "chat");
      const responseData = await generateText(text, systemPrompt, sessionKey);
      const mentionSafe = convertAtUsernamesToMentions(responseData.result, message.guild);
      const response = { data: responseData };

      clearInterval(timer);
      await loadingMsg.delete();

      const safeReply =
        String(mentionSafe || "").trim() ||
        `Halo ${message.author.toString()}! Pesanmu sudah masuk, coba tulis pertanyaannya lebih spesifik ya.`;
      const contentReply =
        safeReply.length > 1900
          ? `${safeReply.slice(0, 1900)}...`
          : safeReply;

      const resultEmbed = new EmbedBuilder()
        .setColor("#0099FF")
        .setAuthor({
          name: "Akhfhid AI",
          iconURL: client.user.displayAvatarURL(),
        })
        .addFields(
          { name: "👤 Asking by", value: message.author.tag, inline: true },
          {
            name: "⏱️ Response Time",
            value: response.data.responseTime,
            inline: true,
          },
          { name: "🌐 Server", value: message.guild?.name || "Direct Message", inline: true }
        )
        .setFooter({ text: `requested by ${message.author.tag}` })
        .setTimestamp();

      await message.reply({
        content: contentReply,
        embeds: [resultEmbed],
        allowedMentions: { parse: ["users"] },
      });
    } catch (error) {
      console.error("Error saat memanggil API AI:", error);

      try {
        if (timer) clearInterval(timer);
        if (loadingMsg) await loadingMsg.delete();
      } catch { }

      const errorEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Terjadi Kesalahan")
        .setDescription("Maaf Fan, aku lagi error nih. Coba sebentar lagi ya.")
        .setFooter({ text: "Jika masalah berlanjut, hubungi administrator." });

      await message.reply({ embeds: [errorEmbed] });
    }
  },
};
