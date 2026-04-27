const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

const uploadChannelPath = path.join(__dirname, "..", "data", "uploadChannels.json");
const uploadDir = path.join(__dirname, "..", "public");

function loadUploadChannels() {
  if (!fs.existsSync(uploadChannelPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(uploadChannelPath, "utf8"));
  } catch (error) {
    console.error("Failed to load upload channel config:", error?.message || error);
    return {};
  }
}

function saveUploadChannels(data) {
  try {
    fs.writeFileSync(uploadChannelPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save upload channel config:", error?.message || error);
  }
}

function ensureUploadDir() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

function sanitizeBaseName(name) {
  return String(name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";
}

function normalizeImageExtByInput(fileName, contentType) {
  const extFromType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[String(contentType || "").toLowerCase()];
  if (extFromType) return extFromType;

  const rawExt = path.extname(String(fileName || "")).replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt)) {
    return rawExt === "jpeg" ? "jpg" : rawExt;
  }
  return null;
}

function buildPublicUrl(filename) {
  const base = String(process.env.UPLOAD_BASE_URL || "https://akhfhid.discord")
    .replace(/\/+$/, "");
  return `${base}/${filename}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("upload")
    .setDescription("Upload image and get public link (private response)")
    .addSubcommand((sub) =>
      sub
        .setName("kirim")
        .setDescription("Upload gambar dan dapatkan link")
        .addAttachmentOption((opt) =>
          opt.setName("gambar").setDescription("File gambar").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("nama")
            .setDescription("Nama file (opsional, tanpa ekstensi)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set channel khusus upload (Admin)")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel tujuan upload")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Lihat status channel upload")
    )
    .addSubcommand((sub) =>
      sub.setName("disable").setDescription("Matikan channel khusus upload (Admin)")
    )
    .addSubcommand((sub) =>
      sub.setName("tutorial").setDescription("Panduan detail fitur upload")
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      return interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();
    const uploadChannels = loadUploadChannels();
    const prefix = process.env.PREFIX || "!";
    const hasAdminPerm =
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

    if (sub === "tutorial") {
      const embed = new EmbedBuilder()
        .setColor("#00B4D8")
        .setTitle("Panduan Upload Gambar")
        .setDescription(
          "Semua hasil `/upload` dikirim secara private (only visible to you)."
        )
        .addFields(
          {
            name: "1) Aktivasi Channel (Admin)",
            value: "`/upload set channel:#nama-channel`",
          },
          {
            name: "2) Cek Status",
            value: "`/upload status`",
          },
          {
            name: "3) Upload Gambar",
            value: "`/upload kirim gambar:<attachment> nama:<opsional>`",
          },
          {
            name: "4) Nonaktifkan",
            value: "`/upload disable`",
          },
          {
            name: "Catatan",
            value:
              `• Prefix \`${prefix}upload\` tetap ada untuk set/status/disable & fallback.\n` +
              "• Link default: `https://akhfhid.discord/nama-file.ext` (bisa override via env `UPLOAD_BASE_URL`).\n" +
              "• Format: JPG, PNG, WEBP, GIF.",
          }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === "set") {
      if (!hasAdminPerm) {
        return interaction.reply({
          content: "Hanya admin yang bisa set channel upload.",
          ephemeral: true,
        });
      }
      const channel = interaction.options.getChannel("channel", true);
      uploadChannels[interaction.guild.id] = channel.id;
      saveUploadChannels(uploadChannels);
      return interaction.reply({
        content: `Channel upload diset ke ${channel.toString()}.`,
        ephemeral: true,
      });
    }

    if (sub === "status") {
      const configuredChannelId = uploadChannels[interaction.guild.id];
      if (!configuredChannelId) {
        return interaction.reply({
          content: "Belum ada channel upload yang diset.",
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: `Channel upload saat ini: <#${configuredChannelId}>`,
        ephemeral: true,
      });
    }

    if (sub === "disable") {
      if (!hasAdminPerm) {
        return interaction.reply({
          content: "Hanya admin yang bisa disable channel upload.",
          ephemeral: true,
        });
      }
      delete uploadChannels[interaction.guild.id];
      saveUploadChannels(uploadChannels);
      return interaction.reply({
        content: "Channel upload dinonaktifkan.",
        ephemeral: true,
      });
    }

    if (sub === "kirim") {
      const configuredChannelId = uploadChannels[interaction.guild.id];
      if (!configuredChannelId) {
        return interaction.reply({
          content: "Fitur upload belum aktif. Minta admin jalankan `/upload set` dulu.",
          ephemeral: true,
        });
      }

      if (interaction.channelId !== configuredChannelId) {
        return interaction.reply({
          content: `Upload hanya bisa di <#${configuredChannelId}>.`,
          ephemeral: true,
        });
      }

      const attachment = interaction.options.getAttachment("gambar", true);
      const ext = normalizeImageExtByInput(attachment.name, attachment.contentType);
      if (!ext) {
        return interaction.reply({
          content: "Format gambar belum didukung. Pakai JPG, PNG, WEBP, atau GIF.",
          ephemeral: true,
        });
      }

      ensureUploadDir();
      await interaction.deferReply({ ephemeral: true });

      const requestedName = interaction.options.getString("nama");
      const baseName = sanitizeBaseName(
        requestedName || path.parse(attachment.name || "image").name
      );
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const fileName = `${baseName}-${uniqueSuffix}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      try {
        const response = await axios.get(attachment.url, {
          responseType: "arraybuffer",
          timeout: 15000,
        });
        fs.writeFileSync(filePath, response.data);
      } catch (error) {
        console.error("Failed to download/upload image:", error?.message || error);
        return interaction.editReply("Gagal upload gambar. Coba lagi bentar lagi.");
      }

      const publicUrl = buildPublicUrl(fileName);
      return interaction.editReply(
        `✅ Upload berhasil.\nLink kamu:\n${publicUrl}\n\nPesan ini hanya terlihat oleh kamu.`
      );
    }
  },
};
