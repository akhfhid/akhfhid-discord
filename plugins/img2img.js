const axios = require("axios");
const akhfhid = process.env.BASE_API;
const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    AttachmentBuilder,
} = require("discord.js");

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

                    // Use the modal interaction for updates from now on
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
                const apiUrl = `${akhfhid}/image-generation/nano-banana/v1`;
                const params = {
                    prompt: prompt,
                    imageUrl: imageUrl,
                };

                const response = await axios.get(apiUrl, { params });

                clearInterval(timer);

                if (response.data && response.data.success && response.data.result) {
                    const resultUrl = response.data.result;
                    const timeTaken = response.data.responseTime || "N/A";

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
                    throw new Error("API returned unsuccessful response");
                }
            } catch (error) {
                clearInterval(timer);
                console.error("Error in img2img:", error);
                await interaction.editReply({
                    content:
                        "❌ Failed to generate image. The API might be down or the image URL is invalid.",
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
