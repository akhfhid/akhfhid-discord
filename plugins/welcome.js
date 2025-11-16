const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const welcomeChannelsPath = path.join(__dirname, '../data/welcomeChannels.json');

let welcomeChannels = {};
if (fs.existsSync(welcomeChannelsPath)) {
    welcomeChannels = JSON.parse(fs.readFileSync(welcomeChannelsPath, 'utf8'));
}
module.exports = {
    name: "welcome",
    description: "Configure the server's welcome message channel",
    alias: ["w"],
    run: async (client, message, args) => {

        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply(" You do not have permission to configure welcome messages!");
        }

        if (args.length === 0) {
            const channelId = welcomeChannels[message.guild.id];
            if (!channelId) {
                return message.reply("No welcome channel has been set!");
            }

            const channel = message.guild.channels.cache.get(channelId);
            if (!channel) {
                return message.reply("The previously set welcome channel could not be found!");
            }

            return message.reply(`Current welcome channel: ${channel}`);
        }

        if (args[0].toLowerCase() === "disable") {
            delete welcomeChannels[message.guild.id];
            fs.writeFileSync(welcomeChannelsPath, JSON.stringify(welcomeChannels));
            return message.reply("Welcome messages have been disabled!");
        }

        const welcomeChannel = message.mentions.channels.first();
        if (!welcomeChannel) {
            return message.reply(
                "Please mention a channel to set as the welcome channel, or use `!welcome disable` to turn it off!"
            );
        }
        welcomeChannels[message.guild.id] = welcomeChannel.id;
        fs.writeFileSync(welcomeChannelsPath, JSON.stringify(welcomeChannels));
        client.welcomeChannels = client.welcomeChannels || new Map();
        client.welcomeChannels.set(message.guild.id, welcomeChannel.id);

        message.reply(` Welcome messages will now be sent in ${welcomeChannel}`);
    },

    welcomeChannels
};
