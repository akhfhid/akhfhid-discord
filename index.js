const os = require("os");
require("dotenv").config();
const {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { YtDlpPlugin } = require("@distube/yt-dlp");
const ffmpeg = require("ffmpeg-static");

const { DisTube } = require("distube");

const fs = require("fs");
const cron = require("node-cron");
let commandCounter = 0;
const path = require("path");
const commandUsage = new Map();
const stalkerData = new Map(); // Define stalkerData globally
const handler = require("./handler");
const levelDataPath = path.join(__dirname, "data/levels.json");
const express = require("express");
const app = express();
const port = 9995;
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Map();
client.aliases = new Map();
require("./slashHandler")(client);

try {
  client.distube = new DisTube(client, {
    ffmpeg: {
      path: ffmpeg,
    },
    plugins: [new YtDlpPlugin()],
  });


  console.log("DisTube berhasil diinisialisasi");
} catch (error) {
  console.error("Error saat menginisialisasi DisTube:", error);
  process.exit(1);
}

client.distube.on("playSong", (queue, song) => {
  queue.textChannel.send(
    `🎵 Memutar: **${song.name}** - \`${song.formattedDuration}\``
  );
});

client.distube.on("addSong", (queue, song) => {
  queue.textChannel.send(
    ` Ditambahkan ke antrian: **${song.name}** - \`${song.formattedDuration}\``
  );
});

client.distube.on("finish", (queue) => {
  queue.textChannel.send(" Antrian lagu telah selesai!");
});

client.distube.on("error", (channel, e) => {
  console.error(`Error di channel ${channel.name}: ${e}`);
  channel.send("Terjadi kesalahan saat memutar lagu!");
});

const welcomeChannelsPath = path.join(__dirname, "data/welcomeChannels.json");
let welcomeChannels = {};
if (fs.existsSync(welcomeChannelsPath)) {
  welcomeChannels = JSON.parse(fs.readFileSync(welcomeChannelsPath, "utf8"));
}

client.welcomeChannels = new Map();
for (const [guildId, channelId] of Object.entries(welcomeChannels)) {
  client.welcomeChannels.set(guildId, channelId);
}

let cachedStats = {
  // Data Bot
  serverCount: 0,
  userCount: 0,
  uptime: 0,
  commandsRun: 0,
  botStatus: "Connecting",
  ping: 0,

  // Data Server (Statis, cukup diisi sekali)
  nodeVersion: process.version,
  discordJsVersion: require("discord.js").version,
  discordJsVersion: require("discord.js").version,
  discordJsVersion: require("discord.js").version,
  platform: os.platform(),
  popularCommand: "None",
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/privacy-policy", (req, res) => {
  res.render("privacy");
});

app.get("/term-of-service", (req, res) => {
  res.render("terms");
});

// --- Recent Activity Tracking ---
const recentActivities = [];
const MAX_ACTIVITIES = 10;

function maskUsername(username) {
  if (username.length <= 3) return username;
  return username.substring(0, 3) + "xxxx";
}

function addActivity(description, type = "info") {
  const activity = {
    description,
    type,
    timestamp: new Date(),
  };
  recentActivities.unshift(activity);
  if (recentActivities.length > MAX_ACTIVITIES) {
    recentActivities.pop();
  }
}

const botStartTime = Date.now();
async function fetchStats() {
  console.log('Mengupdate data statistik dashboard...');
  try {
    // --- Data Bot (Dinamis) ---
    cachedStats.serverCount = client.guilds.cache.size;

    let totalMembers = 0;
    client.guilds.cache.forEach(guild => {
      totalMembers += guild.memberCount;
    });
    cachedStats.userCount = totalMembers;

    cachedStats.uptime = Date.now() - botStartTime;
    cachedStats.ping = client.ws.ping;
    cachedStats.botStatus = client.ws.status === 0 ? 'Online' : 'Offline';

    // --- Data Server (Dinamis) ---
    const loadAvg = os.loadavg()[0];
    cachedStats.cpuLoad = `${(loadAvg * 100).toFixed(1)}%`;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = (usedMem / totalMem) * 100;
    cachedStats.memoryUsage = `${memUsagePercent.toFixed(1)}% (${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB)`;

    // --- Data Aktivitas (Dinamis) ---
    cachedStats.commandsRun = commandCounter; // Ambil nilai dari penghitung
    cachedStats.serverUptime = os.uptime();

    // --- Popular Command Calculation ---
    let maxUsage = 0;
    let popularCmd = "None";
    for (const [cmd, usage] of commandUsage.entries()) {
      if (usage > maxUsage) {
        maxUsage = usage;
        popularCmd = cmd;
      }
    }
    cachedStats.popularCommand = popularCmd !== "None" ? `${popularCmd} ` : "None";


    console.log('Statistik dashboard berhasil diupdate!');
  } catch (error) {
    console.error('Gagal mengupdate statistik dashboard:', error);
  }
}
client.on("clientReady", async () => {
  console.log(`Bot online sebagai ${client.user.tag}`);
  console.log(`Bot di ${client.guilds.cache.size} server`);
  console.log(
    `Welcome channels diatur untuk ${client.welcomeChannels.size} server`
  );
  await client.loadSlash();
  console.log("Slash commands berhasil dipush!");
  fetchStats();
  setInterval(fetchStats, 5 * 60 * 1000);
});

client.on("guildMemberAdd", (member) => {
  const welcomeChannelId = client.welcomeChannels?.get(member.guild.id);
  if (!welcomeChannelId) return;

  const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) return;

  let commandList = "";
  const maxCommandsToShow = 10;
  let commandCount = 0;
  const sortedCommands = Array.from(client.commands.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  for (const command of sortedCommands) {
    if (commandCount >= maxCommandsToShow) break;
    commandList += `**!${command.name}** - *${command.description || "Tidak ada deskripsi"
      }*\n`;
    if (command.alias && command.alias.length > 0) {
      commandList += `   ➤ Alias: ${command.alias
        .map((a) => `\`${a}\``)
        .join(", ")}\n`;
    }
    commandCount++;
  }

  if (client.commands.size > maxCommandsToShow) {
    commandList += `\nDan ${client.commands.size - maxCommandsToShow
      } command lainnya. Ketik \`!help\` untuk melihat semua.`;
  }

  const embed = new EmbedBuilder()
    .setColor("#00FFAA")
    .setTitle("👋 Welcome to the Server!")
    .setDescription(
      `Hello ${member.toString()}! We're happy to have you here in **${member.guild.name
      }**!`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields({
      name: `Command List (${client.commands.size} total)`,
      value: commandList || "No commands available.",
    })
    .setImage(member.guild.bannerURL({ size: 2048 }))
    .setFooter({ text: `You are member number ${member.guild.memberCount}!` })
    .setTimestamp();

  welcomeChannel.send({
    content: `Welcome ${member.toString()}!`,
    embeds: [embed],
  });
});

const pluginWatcher = handler(client);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  console.log(
    `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ 📩 New Message Received
┃ 
┃ 👤 User      : ${message.author.tag}
┃ 🆔 User ID   : ${message.author.id}
┃ 🏠 Server    : ${message.guild.name}
┃ 🆔 Server ID : ${message.guild.id}
┃ 💬 Message   : ${message.content}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
  const prefix = process.env.PREFIX || "!";

  const fakeCmd = message.content.split(" ")[0] || "message";
  addActivity(`User ${maskUsername(message.author.username)} run command `, "command");

  commandCounter++;
  cachedStats.commandsRun = commandCounter;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const command =
    client.commands.get(cmd) || client.commands.get(client.aliases.get(cmd));

  if (!command) return;

  try {
    await command.run(client, message, args);

    commandCounter++;
    cachedStats.commandsRun = commandCounter;

    const currentUsage = commandUsage.get(command.name) || 0;
    commandUsage.set(command.name, currentUsage + 1);

    let maxUsage = 0;
    let popularCmd = "None";
    for (const [c, u] of commandUsage.entries()) {
      if (u > maxUsage) {
        maxUsage = u;
        popularCmd = c;
      }
    }
    cachedStats.popularCommand = popularCmd !== "None" ? `${popularCmd} ` : "None";

  } catch (e) {
    console.error(e);
    message.reply("Terjadi kesalahan saat menjalankan command!");
  }
});

let levelCache = {};
if (fs.existsSync(levelDataPath)) {
  try {
    levelCache = JSON.parse(fs.readFileSync(levelDataPath, "utf8"));
  } catch (e) {
    console.error("Failed to load level data:", e);
    levelCache = {};
  }
}

function saveLevelDataAsync() {
  fs.writeFile(levelDataPath, JSON.stringify(levelCache, null, 2), "utf8", (err) => {
    if (err) console.error("Failed to save level data:", err);
  });
}

// Save level data every 60 seconds
setInterval(saveLevelDataAsync, 60 * 1000);

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.guild) {
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (!levelCache[guildId]) {
      levelCache[guildId] = {};
    }

    if (!levelCache[guildId][userId]) {
      levelCache[guildId][userId] = {
        xp: 0,
        level: 0,
        lastMessage: 0,
      };
    }

    const user = levelCache[guildId][userId];
    const now = Date.now();
    const cooldown = 60000; // 1 minute cooldown

    if (now - user.lastMessage > cooldown) {
      const xpToGive = Math.floor(Math.random() * 11) + 15;
      user.xp += xpToGive;
      user.lastMessage = now;

      const xpForNextLevel =
        50 * Math.pow(user.level + 1, 2) + 50 * (user.level + 1) + 100;

      if (user.xp >= xpForNextLevel) {
        user.level += 1;
        user.xp = user.xp - xpForNextLevel;

        const levelUpEmbed = new EmbedBuilder()
          .setColor("#FFD700")
          .setTitle(`🎉 LEVEL UP!`)
          .setDescription(
            `Selamat ${message.author.toString()}! Anda sekarang telah mencapai **Level ${user.level
            }**!`
          )
          .setThumbnail(
            message.author.displayAvatarURL({ dynamic: true })
          )
          .setTimestamp();

        await message.channel.send({ embeds: [levelUpEmbed] });
      }
      // console.log(`XP: ${user.xp}, Level: ${user.level}`); // Reduced logging
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = client.slashCommands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(err);
      return interaction.reply({ content: "Terjadi error.", ephemeral: true });
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "help_menu_select") {
      const selectedCommandName = interaction.values[0];
      const command = interaction.client.commands.get(selectedCommandName);

      if (!command) {
        await interaction.update({
          content: `Command \`${selectedCommandName}\` tidak ditemukan.`,
          components: [],
          embeds: [],
        });
        return;
      }

      const detailEmbed = new EmbedBuilder()
        .setColor("#77B255")
        .setTitle(`🔍 Detail Command: ${command.name}`)
        .addFields(
          {
            name: "📝 Deskripsi",
            value: command.description || "Tidak ada deskripsi.",
            inline: false,
          },
          {
            name: "⚙️ Cara Pakai",
            value: `\`${process.env.PREFIX || "!"}${command.name}\``,
            inline: true,
          }
        )
        .setTimestamp();

      if (command.alias && command.alias.length > 0) {
        detailEmbed.addFields({
          name: "🔗 Alias",
          value: command.alias.map((a) => `\`${a}\``).join(", "),
          inline: true,
        });
      }

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("help_back_button")
          .setLabel("← Kembali ke Daftar")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        embeds: [detailEmbed],
        components: [backButton],
      });
    }
  } else if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId === "help_back_button") {
      const commands = Array.from(interaction.client.commands.values());
      const options = commands.map((cmd) => ({
        label: cmd.name,
        description: (cmd.description || "Tidak ada deskripsi.").substring(
          0,
          100
        ),
        value: cmd.name,
        emoji: "🔧",
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("help_menu_select")
        .setPlaceholder("Pilih sebuah command untuk melihat detailnya...")
        .addOptions(options);

      const actionRow = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setColor("#0099FF")
        .setTitle("📚 Pusat Bantuan Command")
        .setDescription(
          `Hai ${interaction.user.toString()}! Ada ${commands.length
          } command yang tersedia. Silakan pilih dari menu di bawah untuk melihat informasi lebih lanjut.`
        )
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: [actionRow],
      });
    } else if (
      customId.startsWith("view_") ||
      customId.startsWith("download_")
    ) {
      const [, type, messageId] = customId.split("_");
      const researchData = client.researchData?.get(messageId);

      if (!researchData || researchData.authorId !== interaction.user.id) {
        await interaction.reply({
          content: "Anda tidak memiliki izin untuk menggunakan tombol ini!",
          ephemeral: true,
        });
        return;
      }

      const { result } = researchData;

      try {
        switch (type) {
          case "sources":
            const sourcesEmbed = new EmbedBuilder()
              .setColor("#0099FF")
              .setTitle("📄 Sumber Riset")
              .setDescription(
                result.source_urls
                  .slice(0, 10)
                  .map((url, index) => `${index + 1}. ${url}`)
                  .join("\n")
              )
              .setFooter({
                text: `Menampilkan 10 dari ${result.source_urls.length} sumber`,
              })
              .setTimestamp();

            await interaction.update({
              embeds: [sourcesEmbed],
              components: [],
            });
            break;

          case "images":
            const imagesEmbed = new EmbedBuilder()
              .setColor("#FF9900")
              .setTitle("🖼️ Gambar Riset")
              .setDescription("Gambar-gambar yang ditemukan selama riset:")
              .setImage(result.selected_images[0])
              .setTimestamp();

            await interaction.update({ embeds: [imagesEmbed], components: [] });
            break;

          case "files":
            const filesEmbed = new EmbedBuilder()
              .setColor("#00FF00")
              .setTitle("📥 File Riset")
              .setDescription("Pilih format file yang ingin diunduh:")
              .addFields(
                {
                  name: "📄 PDF",
                  value: `[Unduh](${result.files.pdf})`,
                  inline: true,
                },
                {
                  name: "📝 DOCX",
                  value: `[Unduh](${result.files.docx})`,
                  inline: true,
                },
                {
                  name: "📄 Markdown",
                  value: `[Unduh](${result.files.md})`,
                  inline: true,
                },
                {
                  name: "📊 JSON",
                  value: `[Unduh](${result.files.json})`,
                  inline: true,
                }
              )
              .setTimestamp();

            await interaction.update({ embeds: [filesEmbed], components: [] });
            break;
        }
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Terjadi kesalahan saat menampilkan detail!",
          ephemeral: true,
        });
      }
    } else if (customId.startsWith("view_sources_")) {
      const [, messageId] = customId.split("_");
      const researchData = client.researchData?.get(messageId);

      if (!researchData || researchData.authorId !== interaction.user.id) {
        return await interaction.reply({
          content: "Anda tidak memiliki izin untuk menggunakan tombol ini!",
          ephemeral: true,
        });
      }

      const { result } = researchData;

      try {
        const sourcesEmbed = new EmbedBuilder()
          .setColor("#0099FF")
          .setTitle("📄 Sumber Lengkap Perplexity AI")
          .setDescription(`Sumber untuk query: **${result.query}**`)
          .setTimestamp();

        result.response.search_results.slice(0, 10).forEach((source, index) => {
          sourcesEmbed.addFields({
            name: `${index + 1}. ${source.name}`,
            value: `${source.snippet.substring(0, 100)}...\n[Link](${source.url
              })`,
          });
        });

        if (result.response.search_results.length > 10) {
          sourcesEmbed.setFooter({
            text: `Menampilkan 10 dari ${result.response.search_results.length} sumber total`,
          });
        }

        await interaction.update({ embeds: [sourcesEmbed], components: [] });
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Terjadi kesalahan saat menampilkan detail!",
          ephemeral: true,
        });
      }
    } else if (customId.includes("_")) {
      // Ignore perplexity buttons handled by collectors
      if (["prev_source", "next_source", "delete_source"].includes(customId)) return;

      const [, type, messageId] = customId.split("_");
      const userData = stalkerData.get(messageId);

      if (!userData) {
        return await interaction.reply({
          content: "Data tidak ditemukan!",
          ephemeral: true,
        });
      }

      try {
        switch (type) {
          case "profile":
            const profileEmbed = new EmbedBuilder()
              .setColor("#0099FF")
              .setTitle(`👤 Profil Lengkap: ${userData.basic.name}`)
              .setDescription(
                userData.basic.description || "Tidak ada deskripsi"
              )
              .addFields(
                {
                  name: "🆔 ID Pengguna",
                  value: userData.basic.id,
                  inline: true,
                },
                {
                  name: "📅 Dibuat",
                  value: new Date(userData.basic.created).toLocaleDateString(
                    "id-ID"
                  ),
                  inline: true,
                },
                {
                  name: "🎮 Status",
                  value: userData.status
                    ? userData.status.userPresences[0]?.userPresenceType === 0
                      ? "🟢 Online"
                      : "🔴 Offline"
                    : "❓ Tidak Diketahui",
                  inline: true,
                },
                {
                  name: "🛡️ Terverifikasi",
                  value: userData.basic.hasVerifiedBadge ? "✅ Ya" : "❌ Tidak",
                  inline: true,
                }
              )
              .setFooter({ text: `Dilihat oleh ${interaction.user.tag}` })
              .setTimestamp();

            if (
              userData.avatar &&
              userData.avatar.headshot &&
              userData.avatar.fullBody &&
              typeof userData.avatar.headshot.data === "string" &&
              typeof userData.avatar.fullBody.data === "string"
            ) {
              profileEmbed.setImage(userData.avatar.headshot.data);
            }

            await interaction.update({
              embeds: [profileEmbed],
              components: [],
            });
            break;

          case "avatar":
            const avatarEmbed = new EmbedBuilder()
              .setColor("#0099FF")
              .setTitle(`🖼️ Avatar: ${userData.basic.name}`)
              .setDescription(`Avatar untuk pengguna ${userData.basic.name}`)
              .setTimestamp();

            if (
              userData.avatar &&
              userData.avatar.headshot &&
              userData.avatar.fullBody &&
              typeof userData.avatar.headshot.data === "string" &&
              typeof userData.avatar.fullBody.data === "string"
            ) {
              if (userData.avatar.headshot.data) {
                avatarEmbed.addFields({
                  name: "📷 Headshot",
                  value: `[Lihat](${userData.avatar.headshot.data})`,
                  inline: true,
                });
              }

              if (userData.avatar.fullBody.data) {
                avatarEmbed.addFields({
                  name: "👤 Full Body",
                  value: `[Lihat](${userData.avatar.fullBody.data})`,
                  inline: true,
                });
              }
            }

            await interaction.update({ embeds: [avatarEmbed], components: [] });
            break;

          case "games":
            const gamesEmbed = new EmbedBuilder()
              .setColor("#0099FF")
              .setTitle(`🎮 Game: ${userData.basic.name}`)
              .setDescription(
                userData.games.favorites
                  ? userData.games.favorites
                    .map(
                      (game, index) =>
                        `${index + 1}. ${game.name || "Game Tanpa Nama"}`
                    )
                    .join("\n")
                  : "Tidak ada game favorit"
              )
              .setTimestamp();

            await interaction.update({ embeds: [gamesEmbed], components: [] });
            break;

          case "social":
            const socialEmbed = new EmbedBuilder()
              .setColor("#0099FF")
              .setTitle(`🌐 Social: ${userData.basic.name}`)
              .addFields(
                {
                  name: "👥 Teman",
                  value: userData.social.friends?.count || "0",
                  inline: true,
                },
                {
                  name: "👥 Pengikut",
                  value: userData.social.followers?.count || "0",
                  inline: true,
                },
                {
                  name: "👥 Diikuti",
                  value: userData.social.following?.count || "0",
                  inline: true,
                }
              )
              .setTimestamp();

            await interaction.update({ embeds: [socialEmbed], components: [] });
            break;

          case "stats":
            const statsEmbed = new EmbedBuilder()
              .setColor("#0099FF")
              .setTitle(`📊 Statistik: ${userData.basic.name}`)
              .addFields(
                {
                  name: "👥 Teman",
                  value: userData.social.friends?.count || "0",
                  inline: true,
                },
                {
                  name: "👥 Pengikut",
                  value: userData.social.followers?.count || "0",
                  inline: true,
                },
                {
                  name: "👥 Diikuti",
                  value: userData.social.following?.count || "0",
                  inline: true,
                }
              )
              .setTimestamp();

            await interaction.update({ embeds: [statsEmbed], components: [] });
            break;
        }
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: "Terjadi kesalahan saat menampilkan detail!",
          ephemeral: true,
        });
      }
    }
  }
});
const configPath = path.join(__dirname, "data/scheduleConfig.json");
let scheduleConfig = {};
if (fs.existsSync(configPath)) {
  scheduleConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
}
async function sendScheduledMessage() {
  console.log(`[${new Date().toLocaleString()}] Mengecek jadwal harian...`);

  for (const [guildId, config] of Object.entries(scheduleConfig)) {
    if (!config.enabled) continue;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue;

    const channel = guild.channels.cache.get(config.channelId);
    if (!channel) continue;

    const dayNames = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
    const now = new Date();
    const dayName = dayNames[now.getDay()];
    const dateStr = now.toLocaleDateString("id-ID");
    const timeStr = now.toLocaleTimeString("id-ID");

    const messageTemplate = `🌅 **Pesan Pagi Harian**\nSelamat pagi warga ${guild.name}! ☀️\nHari ${dayName}, ${dateStr} pukul ${timeStr}.\n\nSemoga hari ini penuh berkah dan produktif. Jangan lupa bahagia dan tetap semangat! 🎉`;

    try {
      await channel.send(messageTemplate);
      console.log(
        `✅ Pesan jadwal terkirim ke server: ${guild.name} (${guildId})`
      );
    } catch (error) {
      console.error(`❌ Gagal mengirim pesan ke server ${guild.name}:`, error);
    }
  }
}

const scheduledJob = cron.schedule("0 30 7 * * *", sendScheduledMessage, {
  scheduled: true,
  timezone: "Asia/Jakarta",
});

scheduledJob.start();
console.log(" Cron job untuk pesan harian (07:30) telah diaktifkan");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/api/stats", (req, res) => {
  res.json(cachedStats);
});

app.get("/api/activity", (req, res) => {
  res.json(recentActivities);
});


app.listen(port, () => {
  console.log(`Dashboard server berjalan di http://localhost:${port}`);
});
client.login(process.env.TOKEN);
