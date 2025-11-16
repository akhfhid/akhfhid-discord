require("dotenv").config();
const { Client, EmbedBuilder, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { DisTube } = require("distube");
const fs = require('fs');
const path = require('path');
const handler = require("./handler");
const dataDir = path.join(__dirname, 'data');
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
const welcomeChannelsPath = path.join(__dirname, 'data/welcomeChannels.json');
let welcomeChannels = {};
if (fs.existsSync(welcomeChannelsPath)) {
    welcomeChannels = JSON.parse(fs.readFileSync(welcomeChannelsPath, 'utf8'));
}

client.welcomeChannels = new Map();
for (const [guildId, channelId] of Object.entries(welcomeChannels)) {
    client.welcomeChannels.set(guildId, channelId);
}

client.on("clientReady", () => {
    console.log(`Bot online sebagai ${client.user.tag}`);
    console.log(`Bot di ${client.guilds.cache.size} server`);
    console.log(`Welcome channels diatur untuk ${client.welcomeChannels.size} server`);
});

client.on('guildMemberAdd', (member) => {
    const welcomeChannelId = client.welcomeChannels?.get(member.guild.id);
    if (!welcomeChannelId) return;

    const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
    if (!welcomeChannel) return;
    let commandList = '';
    const maxCommandsToShow = 10; 
    let commandCount = 0;
    const sortedCommands = Array.from(client.commands.values()).sort((a, b) => a.name.localeCompare(b.name));

    for (const command of sortedCommands) {
        if (commandCount >= maxCommandsToShow) break;
        commandList += `**!${command.name}** - *${command.description || 'Tidak ada deskripsi'}*\n`;
        if (command.alias && command.alias.length > 0) {
            commandList += `   ➤ Alias: ${command.alias.map(a => `\`${a}\``).join(', ')}\n`;
        }
        commandCount++;
    }

    if (client.commands.size > maxCommandsToShow) {
        commandList += `\nDan ${client.commands.size - maxCommandsToShow} command lainnya. Ketik \`!help\` untuk melihat semua.`;
    }

    const embed = new EmbedBuilder()
        .setColor('#00FFAA')
        .setTitle('👋 Welcome to the Server!')
        .setDescription(`Hello ${member.toString()}! We're happy to have you here in **${member.guild.name}**!`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: `Command List (${client.commands.size} total)`,
                value: commandList || 'No commands available.'
            }
        )
        .setImage(member.guild.bannerURL({ size: 2048 })) // Clean high-res banner
        .setFooter({ text: `You are member number ${member.guild.memberCount}!` })
        .setTimestamp();

    welcomeChannel.send({
        content: `Welcome ${member.toString()}!`,
        embeds: [embed]
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
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('view_') && !customId.startsWith('download_')) return;

    const [, type, messageId] = customId.split('_');
    const researchData = client.researchData?.get(messageId);

    if (!researchData || researchData.authorId !== interaction.user.id) {
        await interaction.reply({ content: 'Anda tidak memiliki izin untuk menggunakan tombol ini!', ephemeral: true });
        return;
    }

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;
        if (!customId.startsWith('view_') && !customId.startsWith('download_')) return;

        const [, type, messageId] = customId.split('_');
        const researchData = client.researchData?.get(messageId);

        if (!researchData || researchData.authorId !== interaction.user.id) {
            await interaction.reply({ content: 'Anda tidak memiliki izin untuk menggunakan tombol ini!', ephemeral: true });
            return;
        }

        const { result } = researchData;

        try {
            switch (type) {
                case 'sources':
                    const sourcesEmbed = new EmbedBuilder()
                        .setColor('#0099FF')
                        .setTitle('📄 Sumber Riset')
                        .setDescription(result.source_urls.slice(0, 10).map((url, index) =>
                            `${index + 1}. ${url}`
                        ).join('\n'))
                        .setFooter({ text: `Menampilkan 10 dari ${result.source_urls.length} sumber` })
                        .setTimestamp();

                    await interaction.update({ embeds: [sourcesEmbed], components: [] });
                    break;

                case 'images':
                    const imagesEmbed = new EmbedBuilder()
                        .setColor('#FF9900')
                        .setTitle('🖼️ Gambar Riset')
                        .setDescription('Gambar-gambar yang ditemukan selama riset:')
                        .setImage(result.selected_images[0])
                        .setTimestamp();

                    await interaction.update({ embeds: [imagesEmbed], components: [] });
                    break;

                case 'files':
                    const filesEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('📥 File Riset')
                        .setDescription('Pilih format file yang ingin diunduh:')
                        .addFields(
                            { name: '📄 PDF', value: `[Unduh](${result.files.pdf})`, inline: true },
                            { name: '📝 DOCX', value: `[Unduh](${result.files.docx})`, inline: true },
                            { name: '📄 Markdown', value: `[Unduh](${result.files.md})`, inline: true },
                            { name: '📊 JSON', value: `[Unduh](${result.files.json})`, inline: true }
                        )
                        .setTimestamp();

                    await interaction.update({ embeds: [filesEmbed], components: [] });
                    break;
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Terjadi kesalahan saat menampilkan detail!', ephemeral: true });
        }
    });
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('view_sources_')) return;

    const [, messageId] = customId.split('_');
    const researchData = client.researchData?.get(messageId);

    if (!researchData || researchData.authorId !== interaction.user.id) {
        return await interaction.reply({ content: 'Anda tidak memiliki izin untuk menggunakan tombol ini!', ephemeral: true });
    }

    const { result } = researchData;

    try {
        // Format hasil pencarian dengan baik
        const sourcesEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📄 Sumber Lengkap Perplexity AI')
            .setDescription(`Sumber untuk query: **${result.query}**`)
            .setTimestamp();

        result.response.search_results.slice(0, 10).forEach((source, index) => {
            sourcesEmbed.addFields(
                {
                    name: `${index + 1}. ${source.name}`,
                    value: `${source.snippet.substring(0, 100)}...\n[Link](${source.url})`
                }
            );
        });

        if (result.response.search_results.length > 10) {
            sourcesEmbed.setFooter({
                text: `Menampilkan 10 dari ${result.response.search_results.length} sumber total`
            });
        }

        await interaction.update({ embeds: [sourcesEmbed], components: [] });
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Terjadi kesalahan saat menampilkan detail!', ephemeral: true });
    }
});
client.login(process.env.TOKEN);