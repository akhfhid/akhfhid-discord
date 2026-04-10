const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Min length
code = code.replace('.setMinLength(10)', '.setMinLength(1)');

// 2. Add image input
const target1 = `      const firstActionRow = new ActionRowBuilder().addComponents(confessionInput);\n      modal.addComponents(firstActionRow);`;
const target1_crlf = target1.replace(/\n/g, '\r\n');
const replacement1 = `      const imageInput = new TextInputBuilder()
        .setCustomId("confession_image")
        .setLabel("Image URL (Opsional)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Link gambar (https://...)")
        .setRequired(false);

      const firstActionRow = new ActionRowBuilder().addComponents(confessionInput);
      const secondActionRow = new ActionRowBuilder().addComponents(imageInput);
      modal.addComponents(firstActionRow, secondActionRow);`;

if (code.includes(target1)) code = code.replace(target1, replacement1);
else if (code.includes(target1_crlf)) code = code.replace(target1_crlf, replacement1);
else console.log("Failed 1");

// 3. Extract image url
const target2 = `const confessionText = interaction.fields.getTextInputValue("confession_text");\n      const channel = interaction.guild.channels.cache.get(channelId);`;
const target2_crlf = target2.replace(/\n/g, '\r\n');
const replacement2 = `const confessionText = interaction.fields.getTextInputValue("confession_text");\n      let imageUrl = null;\n      try { imageUrl = interaction.fields.getTextInputValue("confession_image"); } catch (e) {}\n      const channel = interaction.guild.channels.cache.get(channelId);`;

if (code.includes(target2)) code = code.replace(target2, replacement2);
else if (code.includes(target2_crlf)) code = code.replace(target2_crlf, replacement2);
else console.log("Failed 2");

// 4. Set embed image
const target3 = `.setFooter({ text: \`Confession Box #\${confessionId} • \${interaction.guild.name}\` })\n        .setTimestamp();`;
const target3_crlf = target3.replace(/\n/g, '\r\n');
const replacement3 = `.setFooter({ text: \`Confession Box #\${confessionId} • \${interaction.guild.name}\` })\n        .setTimestamp();\n\n      if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {\n        try { confessionEmbed.setImage(imageUrl); } catch(e) {}\n      }`;

if (code.includes(target3)) code = code.replace(target3, replacement3);
else if (code.includes(target3_crlf)) code = code.replace(target3_crlf, replacement3);
else console.log("Failed 3");

// 5. Update box msg
const target4 = `"✨ Your identity will remain completely anonymous\\n" +\n            "�� Be respectful and kind\\n" +\n            "🔒 Your confession will be posted in this channel"`;
const target4_crlf = target4.replace(/\n/g, '\r\n');
const replacement4 = `"✨ Your identity will remain completely anonymous\\n" +\n            "📸 You can also attach an image via URL\\n" +\n            "💬 Be respectful and kind\\n" +\n            "�� Your confession will be posted in this channel"`;

if (code.includes(target4)) code = code.replace(target4, replacement4);
else if (code.includes(target4_crlf)) code = code.replace(target4_crlf, replacement4);
else console.log("Failed 4");

fs.writeFileSync('index.js', code, 'utf8');
console.log('patched');
