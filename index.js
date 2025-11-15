require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { DisTube } = require("distube");
const handler = require("./handler");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// buat map command & alias
client.commands = new Map();
client.aliases = new Map();

// load distube dengan konfigurasi minimal untuk versi 5.0.7
try {
    client.distube = new DisTube(client, {
        ffmpeg: "C:/ffmpeg/bin/ffmpeg.exe"
    });
    console.log("DisTube berhasil diinisialisasi");
} catch (error) {
    console.error("Error saat menginisialisasi DisTube:", error);
    process.exit(1);
}

client.distube.on("playSong", (queue, song) => {
    queue.textChannel.send(`🎵 Memutar: **${song.name}** - \`${song.formattedDuration}\``);
});

client.distube.on("addSong", (queue, song) => {
    queue.textChannel.send(` Ditambahkan ke antrian: **${song.name}** - \`${song.formattedDuration}\``);
});

client.distube.on("finish", (queue) => {
    queue.textChannel.send(" Antrian lagu telah selesai!");
});

client.distube.on("error", (channel, e) => {
    console.error(`Error di channel ${channel.name}: ${e}`);
    channel.send("Terjadi kesalahan saat memutar lagu!");
});

client.on("clientReady", () => {
    console.log(`Bot online sebagai ${client.user.tag}`);
    console.log(`Bot di ${client.guilds.cache.size} server`);
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
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    const command =
        client.commands.get(cmd) ||
        client.aliases.get(cmd);

    if (!command) return;

    try {
        await command.run(client, message, args);
    } catch (e) {
        console.error(e);
        message.reply("Terjadi kesalahan saat menjalankan command!");
    }
});

client.login(process.env.TOKEN);