const nanobanana = require("../utils/nanobanana");
const fs = require("fs");
const path = require("path");
const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");

const img2imgChannelPath = path.join(__dirname, "..", "data", "img2imgChannels.json");
let img2imgChannels = {};

if (fs.existsSync(img2imgChannelPath)) {
    try {
        img2imgChannels = JSON.parse(fs.readFileSync(img2imgChannelPath, "utf8"));
    } catch (error) {
        console.error("Failed to load img2img channel config:", error?.message || error);
        img2imgChannels = {};
    }
}

function saveImg2imgChannels() {
    try {
        fs.writeFileSync(img2imgChannelPath, JSON.stringify(img2imgChannels, null, 2), "utf8");
    } catch (error) {
        console.error("Failed to save img2img channel config:", error?.message || error);
    }
}

function buildGuideEmbeds(prefix = "!") {
    const examplePrompts = [
        "jadiin gaya anime clean, soft lighting, detail wajah tetap sama",
        "ubah jadi cyberpunk neon city, hujan malam, cinematic",
        "ubah jadi watercolor painting, warna pastel, dreamy mood",
        "buat gaya photobox estetik dengan background pastel",
    ];

    const styleLines = templates
        .map((t) => `• \`${t.value}\` - ${t.label}`)
        .join("\n");

    const guideEmbed = new EmbedBuilder()
        .setColor("#00B4D8")
        .setTitle("🖼️ Img2Img Zone")
        .setDescription(
            "Channel ini khusus untuk edit gambar AI.\n\n" +
            "**Cara pakai cepat:**\n" +
            `1. Upload gambar\n` +
            `2. Ketik \`${prefix}img2img\` di caption / pesan\n` +
            "3. Pilih style di menu UI\n" +
            "4. Tunggu hasilnya muncul"
        )
        .addFields(
            {
                name: "Contoh Prompt Custom",
                value: examplePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n"),
            },
            {
                name: "Tips Biar Hasil Bagus",
                value:
                    "• Jelasin style + mood + lighting\n" +
                    "• Sebutkan elemen penting yang harus dipertahankan\n" +
                    "• Hindari prompt terlalu pendek",
            }
        )
        .setFooter({ text: "Gunakan style template atau Custom Prompt sesuai kebutuhan." });

    const stylesEmbed = new EmbedBuilder()
        .setColor("#0077B6")
        .setTitle("🎨 Daftar Style Img2Img")
        .setDescription(styleLines.slice(0, 4000));

    return [guideEmbed, stylesEmbed];
}

function extractImageUrl(value) {
    if (!value) return null;
    if (typeof value === "string") {
        return /^https?:\/\//i.test(value) ? value : null;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = extractImageUrl(item);
            if (found) return found;
        }
        return null;
    }
    if (typeof value === "object") {
        const priorityKeys = [
            "url",
            "image",
            "imageUrl",
            "output",
            "result",
            "resultUrl",
            "outputUrl",
            "generatedImage",
            "generatedImages",
        ];
        for (const key of priorityKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                const found = extractImageUrl(value[key]);
                if (found) return found;
            }
        }
        for (const nested of Object.values(value)) {
            const found = extractImageUrl(nested);
            if (found) return found;
        }
    }
    return null;
}

const templates = [
    {
        label: "Photobox Style",
        description: "Orang di foto gaya photobox lucu/estetik",
        value: "photobox",
        prompt:
            "use the person from the reference image and recreate them as if photographed in a modern photobox booth, soft lighting, pastel background, minimal gradient colors, cute photobooth framing, playful pose, maintaining hairstyle, facial features, body proportion, and similar outfit.",
    },
    {
        label: "Photobox Romantic",
        description: "Gaya foto couple photobox / aesthetic memory",
        value: "photobox_romantic",
        prompt:
            "use the person from the reference image and recreate them in a romantic aesthetic photobox scene with warm nostalgic filter, soft blush coloring, subtle film grain, polaroid frame, cozy emotional mood, keeping the same hairstyle and facial structure.",
    },
    {
        label: "Aesthetic Waterfall",
        description: "Di dekat air terjun vibes aesthetic natural",
        value: "waterfall_aesthetic",
        prompt:
            "use the person from the reference image and place them in a natural waterfall environment, soft misty water effect, lush greenery, sunlight rays through trees, relaxing atmosphere, calm nature mood, keeping the same hairstyle, pose, and facial features.",
    },
    {
        label: "Pixel Art Waterfall",
        description: "Pixel art natural vibes di air terjun",
        value: "pixel_art_waterfall",
        prompt:
            "transform the person from the reference image into pixel art standing or sitting near an aesthetic waterfall scene, pixelated water flow, green pixel foliage, soft color palette, calm relaxing vibe, keeping same hair and face details.",
    },
    {
        label: "Fantasy Studio Photo",
        description: "Foto ala studio namun fantasi / dreamy",
        value: "fantasy_studio",
        prompt:
            "recreate the person from the reference image in a fantasy studio setting with magical glowing lights, dreamy soft fog, spark particles, gentle light beams, ethereal colored ambiance, preserving facial resemblance and hairstyle.",
    },
    {
        label: "Elegant Portrait",
        description: "Potret elegan tampak artistik & rapi",
        value: "elegant_portrait",
        prompt:
            "recreate them as an elegant portrait, smooth shading, soft bokeh background, subtle rim lighting, portrait photography composition, deeply focused facial details, maintaining hairstyle and original physical traits.",
    },
    {
        label: "Studio Modeling",
        description: "Pose seperti model fashion di studio profesional",
        value: "studio_modeling",
        prompt:
            "use the person from the reference image and recreate them in a professional studio photoshoot, fashion-model pose, clean monochrome background, sharp lighting, shadow definition, keeping same face and hairstyle.",
    },
    {
        label: "Gaming Setup",
        description: "Estetik gamer corner RGB",
        value: "gaming_setup",
        prompt:
            "place the person from the reference image inside an RGB gaming setup, neon purple-blue lighting, gaming chair, dual monitors, LED strips, subtle reflections, keeping the same hairstyle and facial features.",
    },
    {
        label: "Pixel Art Night Coding",
        description: "Pixel art midnight coder",
        value: "pixel_art_night",
        prompt:
            "convert the person from the reference image into a pixel art character coding at night by a window with moonlight, blue cool tones, quiet ambiance, cozy solitary vibe, keeping hairstyle and facial identity.",
    },
    {
        label: "Cozy Reading",
        description: "Aesthetic membaca buku",
        value: "cozy_reading",
        prompt:
            "use the person from the reference image and show them relaxing in a cozy room reading a book, warm ambient light, wooden textures, indoor plants, quiet comfort, keeping facial recognition and hairstyle.",
    },

    {
        label: "Pixel Art",
        description: "Convert to retro pixel art style",
        value: "pixel_art",
        prompt:
            "recreate them as a pixel art character sitting at a cozy aesthetic workspace, typing on a laptop with glowing code on screen, surrounded by warm ambient lighting, small desk plants, soft shadows, warm color palette, gentle pixel textures, keeping the same hairstyle, facial features, and approximate outfit from the original image.",
    },
    {
        label: "Anime Style",
        description: "Convert to high-quality anime style",
        value: "anime",
        prompt:
            "recreate them as a high quality anime character, vibrant colors, detailed eyes, soft shading, dynamic lighting, keeping the same hairstyle, facial features, and approximate outfit from the original image.",
    },
    {
        label: "Cyberpunk",
        description: "Futuristic cyberpunk aesthetic",
        value: "cyberpunk",
        prompt:
            "recreate them in a cyberpunk setting, neon lights, futuristic clothing, high tech accessories, night city background, glowing elements, keeping the same hairstyle, facial features, and approximate outfit from the original image.",
    },
    {
        label: "Realistic",
        description: "Photorealistic interpretation",
        value: "realistic",
        prompt:
            "recreate them as a photorealistic image, 8k resolution, highly detailed, cinematic lighting, depth of field, keeping the same hairstyle, facial features, and approximate outfit from the original image.",
    },
    {
        label: "Watercolor",
        description: "Soft watercolor painting style",
        value: "watercolor",
        prompt:
            "recreate them as a watercolor painting, soft brush strokes, pastel colors, artistic, dreamy atmosphere, keeping the same hairstyle, facial features, and approximate outfit from the original image.",
    },
];

module.exports = {
    name: "img2img",
    alias: ["i2i", "reimagine"],
    description: "Transform an image using AI templates",

    run: async (client, message, args) => {
        if (message.guild) {
            const sub = String(args[0] || "").toLowerCase();
            const isAdmin = message.member?.permissions?.has("Administrator") ||
                message.member?.permissions?.has("ManageGuild");

            if (["set", "setchannel", "channel"].includes(sub)) {
                if (!isAdmin) {
                    return message.reply("Hanya admin yang bisa set channel khusus img2img.");
                }

                const targetChannel =
                    message.mentions.channels.first() ||
                    (String(args[1] || "").toLowerCase() === "here" ? message.channel : null);
                if (!targetChannel) {
                    return message.reply(
                        "Sertakan channel. Contoh: `!img2img set #edit-gambar` atau `!img2img set here`."
                    );
                }

                img2imgChannels[message.guild.id] = targetChannel.id;
                saveImg2imgChannels();
                const prefix = process.env.PREFIX || "!";
                const embeds = buildGuideEmbeds(prefix);
                try {
                    await targetChannel.send({ embeds });
                } catch (error) {
                    console.error("Failed to send img2img guide panel:", error?.message || error);
                }
                return message.reply(
                    `Channel khusus img2img diset ke ${targetChannel.toString()}.\n` +
                    `Panel panduan sudah dikirim di channel tersebut.`
                );
            }

            if (sub === "disable") {
                if (!isAdmin) {
                    return message.reply("Hanya admin yang bisa disable channel khusus img2img.");
                }
                delete img2imgChannels[message.guild.id];
                saveImg2imgChannels();
                return message.reply("Channel khusus img2img dinonaktifkan. Command bisa dipakai di channel mana saja.");
            }

            if (sub === "status") {
                const configuredChannelId = img2imgChannels[message.guild.id];
                if (!configuredChannelId) {
                    return message.reply("Belum ada channel khusus img2img. Pakai `!img2img set #channel`.");
                }
                return message.reply(`Channel khusus img2img saat ini: <#${configuredChannelId}>`);
            }

            if (sub === "guide" || sub === "panel") {
                const targetChannel =
                    message.mentions.channels.first() ||
                    (String(args[1] || "").toLowerCase() === "here" ? message.channel : null) ||
                    (img2imgChannels[message.guild.id]
                        ? message.guild.channels.cache.get(img2imgChannels[message.guild.id])
                        : message.channel);
                if (!targetChannel) {
                    return message.reply("Channel tujuan guide tidak ditemukan.");
                }
                const prefix = process.env.PREFIX || "!";
                const embeds = buildGuideEmbeds(prefix);
                await targetChannel.send({ embeds });
                return message.reply(`Guide img2img dikirim ke ${targetChannel.toString()}.`);
            }

            const configuredChannelId = img2imgChannels[message.guild.id];
            if (configuredChannelId && message.channel.id !== configuredChannelId) {
                return message.reply(
                    `Command img2img hanya bisa dipakai di <#${configuredChannelId}>.\n` +
                    `Admin bisa ubah dengan \`!img2img set #channel\` atau nonaktifkan dengan \`!img2img disable\`.`
                );
            }
        }

        const attachment = message.attachments.first();
        const imageUrl = attachment ? attachment.url : args[0];

        if (!imageUrl) {
            return message.reply(
                "Please attach an image or provide an image URL to use this command!"
            );
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("img2img_template_select")
            .setPlaceholder("Choose a style template...")
            .addOptions(
                {
                    label: "Custom Prompt",
                    description: "Write your own prompt",
                    value: "custom",
                },
                ...templates.map((t) => ({
                    label: t.label,
                    description: t.description,
                    value: t.value,
                }))

            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor("#0099FF")
            .setTitle("🎨 Image to Image Transformation")
            .setDescription(
                "Select a style template below to transform your image.\n\n**Image Source:** [Link](" +
                imageUrl +
                ")"
            )
            .setImage(imageUrl)
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const replyMsg = await message.reply({
            embeds: [embed],
            components: [row],
        });

        const filter = (i) =>
            i.customId === "img2img_template_select" &&
            i.user.id === message.author.id;
        const collector = replyMsg.createMessageComponentCollector({
            filter,
            time: 60000,
        });

        collector.on("collect", async (interaction) => {
            const selectedValue = interaction.values[0];
            let selectedTemplate = templates.find((t) => t.value === selectedValue);
            let prompt = "";
            let label = "";

            if (selectedValue === "custom") {
                const { ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");

                const modal = new ModalBuilder()
                    .setCustomId("img2img_custom_modal")
                    .setTitle("Custom Image Prompt");

                const promptInput = new TextInputBuilder()
                    .setCustomId("custom_prompt_input")
                    .setLabel("Enter your prompt")
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Describe how you want the image to look...")
                    .setRequired(true);

                const firstActionRow = new ActionRowBuilder().addComponents(promptInput);
                modal.addComponents(firstActionRow);

                await interaction.showModal(modal);

                try {
                    const modalSubmit = await interaction.awaitModalSubmit({
                        filter: (i) => i.customId === "img2img_custom_modal" && i.user.id === message.author.id,
                        time: 60000,
                    });

                    prompt = modalSubmit.fields.getTextInputValue("custom_prompt_input");
                    label = "Custom Style";

                    interaction = modalSubmit;
                } catch (e) {
                    return; // Modal timed out or error
                }
            } else {
                if (!selectedTemplate) return;
                prompt = selectedTemplate.prompt;
                label = selectedTemplate.label;
            }

            let seconds = 0;
            const loadingEmbed = new EmbedBuilder()
                .setColor("#FFFF00")
                .setTitle("🎨 Image to Image Transformation")
                .setDescription(
                    `Generating **${label}** version...\n\n**Prompt:** ${prompt}`
                )
                .addFields(
                    { name: "⏱️ Duration", value: "0 Sec", inline: true },
                    { name: "📊 Status", value: "Reading the image...", inline: true }
                )
                .setTimestamp()
                .setFooter({
                    text: `Generated by ${client.user.username} | requested by ${message.author.tag}`,
                });

            await interaction.update({
                content: null,
                components: [],
                embeds: [loadingEmbed],
            });

            const timer = setInterval(() => {
                seconds++;
                const updated = EmbedBuilder.from(loadingEmbed)
                    .setFields(
                        { name: "⏱️ Duration", value: `${seconds} Sec`, inline: true },
                        { name: "📊 Status", value: "Processing image...", inline: true }
                    )
                    .setTimestamp()
                    .setFooter({
                        text: `Generated by ${client.user.username} | requested by ${message.author.tag}`,
                    });
                interaction.editReply({ embeds: [updated] }).catch(() => { });
            }, 1000);

            try {
                const response = await nanobanana({
                    imagePath: imageUrl,
                    prompt,
                });

                clearInterval(timer);

                const resultUrl = extractImageUrl(response);
                if (resultUrl) {
                    const timeTaken = `${seconds} Sec`;

                    const resultEmbed = new EmbedBuilder()
                        .setColor("#00FF00")
                        .setTitle(`✨ ${label} Result`)
                        .setDescription(
                            `**Prompt:** ${prompt}\n**Time:** ${timeTaken}`
                        )
                        .setImage(resultUrl)
                        .setFooter({
                            text: `Generated by ${client.user.username} | requested by ${message.author.tag}`,
                        })
                        .setTimestamp();

                    await interaction.editReply({
                        embeds: [resultEmbed],
                    });
                } else {
                    throw new Error("Nanobanana response did not include a result image URL");
                }
            } catch (error) {
                clearInterval(timer);
                console.error("Error in img2img:", error);
                const detail = String(error?.message || "")
                    .replace(/^AIBanana API Error:\s*/i, "")
                    .trim();
                await interaction.editReply({
                    content:
                        detail
                            ? `❌ Failed to generate image: ${detail}`
                            : "❌ Failed to generate image. The API might be down or the image URL is invalid.",
                    embeds: [],
                });
            }
            collector.stop();
        });

        collector.on("end", (collected, reason) => {
            if (reason === "time") {
                replyMsg.edit({
                    content: "⚠️ Interaction timed out.",
                    components: [],
                }).catch(() => { });
            }
        });
    },
};
