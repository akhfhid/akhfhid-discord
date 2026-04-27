const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const { PermissionFlagsBits } = require("discord.js");

const uploadChannelPath = path.join(__dirname, "..", "data", "uploadChannels.json");
const uploadDir = path.join(__dirname, "..", "public");

let uploadChannels = {};

if (fs.existsSync(uploadChannelPath)) {
  try {
    uploadChannels = JSON.parse(fs.readFileSync(uploadChannelPath, "utf8"));
  } catch (error) {
    console.error("Failed to load upload channel config:", error?.message || error);
    uploadChannels = {};
  }
}

function saveUploadChannels() {
  try {
    fs.writeFileSync(uploadChannelPath, JSON.stringify(uploadChannels, null, 2), "utf8");
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

function normalizeImageExt(attachment) {
  const contentType = String(attachment?.contentType || "").toLowerCase();
  const extFromType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  }[contentType];
  if (extFromType) return extFromType;

  const rawName = String(attachment?.name || "");
  const rawExt = path.extname(rawName).replace(".", "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt)) {
    return rawExt === "jpeg" ? "jpg" : rawExt;
  }

  return null;
}

function buildPublicUrl(filename) {
  let base = String(process.env.UPLOAD_BASE_URL || "").trim();

  if (!base) {
    const rawBaseApi = String(process.env.BASE_URL || "").trim();
    if (rawBaseApi) {
      try {
        const parsed = new URL(rawBaseApi);
        // If BASE_URL is like https://domain/api, use the site root.
        parsed.pathname = "/";
        parsed.search = "";
        parsed.hash = "";
        base = parsed.toString();
      } catch {
        base = "";
      }
    }
  }

  if (!base) {
    base = "https://discord.akhfhid.my.id";
  }

  base = base.replace(/\/+$/, "");
  return `${base}/${filename}`;
}

module.exports = {
  name: "upload",
  alias: ["imgupload", "up"],
  description: "Upload image attachment and get a public link",

  run: async (client, message, args) => {
    if (!message.guild) {
      return message.reply("Command ini hanya bisa dipakai di server.");
    }

    const prefix = process.env.PREFIX || "!";
    const sub = String(args[0] || "").toLowerCase();
    const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
      message.member?.permissions?.has(PermissionFlagsBits.ManageGuild);

    if (["set", "setchannel", "channel"].includes(sub)) {
      if (!isAdmin) {
        return message.reply("Hanya admin yang bisa set channel upload.");
      }

      const targetChannel =
        message.mentions.channels.first() ||
        (String(args[1] || "").toLowerCase() === "here" ? message.channel : null);

      if (!targetChannel) {
        return message.reply(
          `Sertakan channel. Contoh: \`${prefix}upload set #upload\` atau \`${prefix}upload set here\`.`
        );
      }

      uploadChannels[message.guild.id] = targetChannel.id;
      saveUploadChannels();
      return message.reply(`Channel upload diset ke ${targetChannel.toString()}.`);
    }

    if (sub === "disable") {
      if (!isAdmin) {
        return message.reply("Hanya admin yang bisa disable channel upload.");
      }
      delete uploadChannels[message.guild.id];
      saveUploadChannels();
      return message.reply("Channel upload dinonaktifkan.");
    }

    if (sub === "status") {
      const configuredChannelId = uploadChannels[message.guild.id];
      if (!configuredChannelId) {
        return message.reply(`Belum ada channel upload. Pakai \`${prefix}upload set #channel\`.`);
      }
      return message.reply(`Channel upload saat ini: <#${configuredChannelId}>`);
    }

    if (sub === "tutorial" || sub === "help" || sub === "panduan" || sub === "tutor") {
      return message.reply(
        "**Tutorial Upload (Lengkap & Detail)**\n\n" +
        "**A. Setup Awal (Admin)**\n" +
        `1. Set channel upload dengan \`${prefix}upload set #channel\` atau \`${prefix}upload set here\`.\n` +
        `2. Cek channel aktif dengan \`${prefix}upload status\`.\n` +
        `3. Jika ingin mematikan fitur, pakai \`${prefix}upload disable\`.\n\n` +
        "**B. Cara Upload Normal (Link tampil di channel)**\n" +
        `1. Masuk ke channel upload yang sudah diset.\n` +
        `2. Kirim gambar sebagai attachment + tulis command \`${prefix}upload\`.\n` +
        `3. Opsional nama file: \`${prefix}upload nama_file_kamu\`.\n` +
        "4. Bot akan kirim link hasil upload di channel.\n\n" +
        "**C. Cara Upload Private / DM**\n" +
        `1. Kirim gambar sebagai attachment + command \`${prefix}upload private\`.\n` +
        `2. Opsional nama file: \`${prefix}upload private nama_file_kamu\`.\n` +
        "3. Bot kirim link hasil upload ke DM kamu.\n" +
        "4. Kalau DM kamu tertutup, bot akan kasih peringatan di channel.\n\n" +
        "**D. Format & Penamaan File**\n" +
        "• Format didukung: JPG, PNG, WEBP, GIF.\n" +
        "• Nama file otomatis disanitasi (huruf kecil, simbol aneh dibersihkan).\n" +
        "• Bot menambahkan suffix unik agar nama tidak tabrakan.\n\n" +
        "**E. Contoh Pemakaian**\n" +
        `• \`${prefix}upload set #media-upload\`\n` +
        `• \`${prefix}upload status\`\n` +
        `• \`${prefix}upload\` (dengan attachment)\n` +
        `• \`${prefix}upload cover-event\` (dengan attachment)\n` +
        `• \`${prefix}upload private\` (dengan attachment)\n` +
        `• \`${prefix}upload private banner-komunitas\` (dengan attachment)\n\n` +
        "**F. Troubleshooting**\n" +
        "• Error \"fitur belum aktif\": admin belum set channel upload.\n" +
        "• Error \"hanya bisa dipakai di #channel\": kamu jalankan command di channel lain.\n" +
        "• Error format file: pastikan attachment adalah gambar.\n" +
        "• DM gagal: buka DM server settings lalu coba lagi."
      );
    }

    const configuredChannelId = uploadChannels[message.guild.id];
    if (!configuredChannelId) {
      return message.reply(
        `Fitur upload belum aktif di server ini.\nAdmin bisa aktifkan dengan \`${prefix}upload set #channel\`.`
      );
    }

    if (message.channel.id !== configuredChannelId) {
      return message.reply(`Command upload hanya bisa dipakai di <#${configuredChannelId}>.`);
    }

    const attachment = [...message.attachments.values()].find((file) => {
      const isImageByType = String(file.contentType || "").toLowerCase().startsWith("image/");
      return isImageByType || Boolean(normalizeImageExt(file));
    });

    if (!attachment) {
      return message.reply(
        "Kirim gambar sebagai attachment lalu pakai `!upload` (opsional: `!upload nama_file`)."
      );
    }

    const ext = normalizeImageExt(attachment);
    if (!ext) {
      return message.reply("Format gambar belum didukung. Pakai JPG, PNG, WEBP, atau GIF.");
    }

    ensureUploadDir();

    const isPrivateMode = sub === "private";
    const requestedNameRaw = (isPrivateMode ? args.slice(1) : args).join(" ").trim();
    const baseName = sanitizeBaseName(
      requestedNameRaw || path.parse(attachment.name || "image").name
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
      return message.reply("Gagal upload gambar. Coba lagi bentar lagi.");
    }

    const publicUrl = buildPublicUrl(fileName);

    if (isPrivateMode) {
      try {
        await message.author.send(
          `✅ Upload berhasil (Private Mode).\nLink kamu:\n${publicUrl}`
        );
        await message.reply("✅ Link upload sudah dikirim ke DM kamu.");
      } catch (error) {
        console.error("Failed to send upload result to DM:", error?.message || error);
        await message.reply("Aku nggak bisa kirim DM. Buka DM kamu dulu lalu coba lagi.");
      }
      return;
    }

    await message.reply(
      `${message.author.toString()} ✅ Upload berhasil.\nLink kamu: ${publicUrl}`
    );

  },
};
