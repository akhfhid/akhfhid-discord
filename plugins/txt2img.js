const fs = require("fs");
const path = require("path");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const { TXT2IMG_TEMPLATES } = require("../utils/txt2imgTemplates");

const txt2imgChannelPath = path.join(__dirname, "..", "data", "txt2imgChannels.json");
let txt2imgChannels = {};

if (fs.existsSync(txt2imgChannelPath)) {
  try {
    txt2imgChannels = JSON.parse(fs.readFileSync(txt2imgChannelPath, "utf8"));
  } catch (error) {
    console.error("Failed to load txt2img channel config:", error?.message || error);
    txt2imgChannels = {};
  }
}

function saveTxt2imgChannels() {
  try {
    fs.writeFileSync(txt2imgChannelPath, JSON.stringify(txt2imgChannels, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save txt2img channel config:", error?.message || error);
  }
}

function buildTxt2imgPanelEmbed(guildName) {
  const templateList = TXT2IMG_TEMPLATES.map((t, i) => `${i + 1}. ${t.label}`).join("\n");
  return new EmbedBuilder()
    .setColor("#7B2CBF")
    .setTitle("🖼️ Txt2Img Panel")
    .setDescription(
      "Klik tombol di bawah untuk bikin gambar dari teks.\n\n" +
      "• Kamu bisa pilih 5 template siap pakai\n" +
      "• Atau pilih custom dan isi prompt manual lewat form\n" +
      "• Hasil gambar hanya terlihat oleh kamu (ephemeral)"
    )
    .addFields({
      name: "Template Tersedia",
      value: templateList || "Belum ada template",
    })
    .setFooter({ text: `Txt2Img • ${guildName}` })
    .setTimestamp();
}

function buildTxt2imgPanelRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`txt2img_submit_${channelId}`)
      .setLabel("Buat Gambar")
      .setEmoji("🎨")
      .setStyle(ButtonStyle.Primary)
  );
}

async function sendTxt2imgPanel(channel, guildName) {
  return channel.send({
    embeds: [buildTxt2imgPanelEmbed(guildName)],
    components: [buildTxt2imgPanelRow(channel.id)],
  });
}

module.exports = {
  name: "txt2img",
  alias: ["t2i", "text2img"],
  description: "Panel txt2img dengan tombol + form template/custom (ephemeral result)",

  run: async (client, message, args) => {
    if (!message.guild) {
      return message.reply("Command ini hanya bisa dipakai di server.");
    }

    const prefix = process.env.PREFIX || "!";
    const sub = String(args[0] || "").toLowerCase();
    const isAdmin =
      message.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
      message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);

    if (["set", "setchannel", "channel"].includes(sub)) {
      if (!isAdmin) {
        return message.reply("Hanya admin yang bisa set channel txt2img.");
      }

      const targetChannel =
        message.mentions.channels.first() ||
        (String(args[1] || "").toLowerCase() === "here" ? message.channel : null);

      if (!targetChannel) {
        return message.reply(
          `Sertakan channel. Contoh: \`${prefix}txt2img set #txt2img\` atau \`${prefix}txt2img set here\`.`
        );
      }

      txt2imgChannels[message.guild.id] = targetChannel.id;
      saveTxt2imgChannels();

      try {
        await sendTxt2imgPanel(targetChannel, message.guild.name);
      } catch (error) {
        console.error("Failed to send txt2img panel:", error?.message || error);
      }

      return message.reply(`Channel txt2img diset ke ${targetChannel.toString()} dan panel sudah dikirim.`);
    }

    if (sub === "status") {
      const configuredChannelId = txt2imgChannels[message.guild.id];
      if (!configuredChannelId) {
        return message.reply(`Belum ada channel txt2img. Pakai \`${prefix}txt2img set #channel\`.`);
      }
      return message.reply(`Channel txt2img saat ini: <#${configuredChannelId}>`);
    }

    if (sub === "disable") {
      if (!isAdmin) {
        return message.reply("Hanya admin yang bisa disable channel txt2img.");
      }
      delete txt2imgChannels[message.guild.id];
      saveTxt2imgChannels();
      return message.reply("Channel txt2img dinonaktifkan.");
    }

    if (["panel", "tutor", "tutorial", "guide"].includes(sub)) {
      const configuredChannelId = txt2imgChannels[message.guild.id];
      const targetChannel =
        message.mentions.channels.first() ||
        (String(args[1] || "").toLowerCase() === "here" ? message.channel : null) ||
        (configuredChannelId ? message.guild.channels.cache.get(configuredChannelId) : message.channel);

      if (!targetChannel) {
        return message.reply("Channel tujuan tidak ditemukan.");
      }

      await sendTxt2imgPanel(targetChannel, message.guild.name);
      return message.reply(`Panel txt2img dikirim ke ${targetChannel.toString()}.`);
    }

    const configuredChannelId = txt2imgChannels[message.guild.id];
    if (configuredChannelId && message.channel.id !== configuredChannelId) {
      return message.reply(
        `Txt2img hanya bisa dipakai di <#${configuredChannelId}>.\n` +
        `Admin bisa ubah dengan \`${prefix}txt2img set #channel\` atau nonaktifkan \`${prefix}txt2img disable\`.`
      );
    }

    await sendTxt2imgPanel(message.channel, message.guild.name);
    return message.reply("Panel txt2img sudah dikirim. Klik tombolnya untuk mulai.");
  },
};
