// const axios = require('axios');
// const { EmbedBuilder } = require('discord.js');
// const crypto = require('crypto');

// module.exports = {
//     name: "sora",
//     alias: ["video", "text2video"],
//     description: "Generate video from text using Sora AI",

//     run: async (client, message, args) => {
//         const prompt = args.join(" ");
//         if (!prompt) {
//             return message.reply("Please provide a prompt! Example: `!sora a woman relaxing on the beach`");
//         }

//         let seconds = 0;
//         const loadingEmbed = new EmbedBuilder()
//             .setColor('#FFFF00')
//             .setTitle('🎬 Sora AI Video Generation')
//             .setDescription(`Generating video for:\n**${prompt}**`)
//             .setTimestamp()
//             .addFields(
//                 { name: '⏱️ Duration', value: `0 Sec`, inline: true },
//                 { name: '📊 Status', value: `Initializing task...`, inline: true }
//             )
//             .setFooter({ text: `Requested by ${message.author.tag}` });

//         const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

//         const timer = setInterval(() => {
//             seconds++;
//             const updated = EmbedBuilder.from(loadingEmbed)
//                 .setFields(
//                     { name: '⏱️ Duration', value: `${seconds} Sec`, inline: true },
//                     { name: '📊 Status', value: `Generating video... (This may take a while)`, inline: true }
//                 );
//             loadingMsg.edit({ embeds: [updated] }).catch(() => { });
//         }, 1000);

//         try {
//             const api = axios.create({
//                 baseURL: 'https://api.bylo.ai/aimodels/api/v1/ai',
//                 headers: {
//                     accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
//                     'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
//                     'Accept-Encoding': 'gzip, deflate, br',
//                     'cache-control': 'max-age=0',
//                     connection: 'keep-alive',
//                     'content-type': 'application/json; charset=UTF-8',
//                     dnt: '1',
//                     origin: 'https://bylo.ai',
//                     pragma: 'no-cache',
//                     referer: 'https://bylo.ai/features/sora-2',
//                     'sec-ch-prefers-color-scheme': 'dark',
//                     'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
//                     'sec-ch-ua-arch': '""',
//                     'sec-ch-ua-bitness': '""',
//                     'sec-ch-ua-full-version': '"137.0.7337.0"',
//                     'sec-ch-ua-full-version-list': '"Chromium";v="137.0.7337.0", "Not/A)Brand";v="24.0.0.0"',
//                     'sec-ch-ua-mobile': '?1',
//                     'sec-ch-ua-model': '"SM-F958"',
//                     'sec-ch-ua-platform': '"Android"',
//                     'sec-ch-ua-platform-version': '"15.0.0"',
//                     'sec-ch-ua-wow64': '?0',
//                     'sec-fetch-dest': 'document',
//                     'sec-fetch-mode': 'navigate',
//                     'sec-fetch-site': 'same-origin',
//                     'sec-fetch-user': '?1',
//                     'upgrade-insecure-requests': '1',
//                     'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
//                     'x-requested-with': 'XMLHttpRequest',
//                     uniqueId: crypto.randomUUID().replace(/-/g, '')
//                 }
//             });

//             const { data: task } = await api.post('/video/create', {
//                 prompt: prompt,
//                 channel: 'SORA2',
//                 pageId: 536,
//                 source: 'bylo.ai',
//                 watermarkFlag: true,
//                 privateFlag: true,
//                 isTemp: true,
//                 vipFlag: true,
//                 model: 'sora_video2',
//                 videoType: 'text-to-video',
//                 aspectRatio: 'portrait' // Default to portrait as per code snippet, could be made configurable
//             });

//             let videoResult = null;
//             let attempts = 0;
//             const maxAttempts = 120; // 2 minutes timeout

//             while (attempts < maxAttempts) {
//                 const { data } = await api.get(`/${task.data}?channel=SORA2`);

//                 if (data.data && data.data.state > 0) {
//                     const completeData = JSON.parse(data.data.completeData);
//                     if (completeData && completeData.length > 0) {
//                         videoResult = completeData[0].url;
//                         break;
//                     }
//                 }

//                 attempts++;
//                 await new Promise(res => setTimeout(res, 1000));
//             }

//             clearInterval(timer);

//             if (!videoResult) {
//                 return loadingMsg.edit({
//                     content: "Timeout or failed to generate video.",
//                     embeds: []
//                 });
//             }

//             const resultEmbed = new EmbedBuilder()
//                 .setColor("#00FF00")
//                 .setTitle("✨ Sora AI Video Result")
//                 .setDescription(`**Prompt:** ${prompt}`)
//                 .addFields(
//                     { name: "⏱️ Duration", value: `\`${seconds} Sec\``, inline: true },
//                     { name: "🎥 Video URL", value: `[Click to Watch](${videoResult})`, inline: true }
//                 )
//                 .setFooter({ text: `Generated by ${client.user.username} | requested by ${message.author.tag}` })
//                 .setTimestamp();

//             await loadingMsg.edit({
//                 content: `Here is your AI generated video!`,
//                 embeds: [resultEmbed],
//                 files: [videoResult]
//             });

//         } catch (error) {
//             clearInterval(timer);
//             console.error("Sora Error:", error);
//             await loadingMsg.edit({
//                 content: "An error occurred while generating the video.",
//                 embeds: []
//             });
//         }
//     }
// };
