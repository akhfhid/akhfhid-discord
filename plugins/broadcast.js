const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "broadcast",
    alias: ["bc", "broadcast"],
    description: "Broadcast announcement about new features to all servers (Owner Only)",
    run: async (client, message, args) => {
        if (message.author.id !== "870115369174564914") {
            return message.reply("You do not have permission to use this command.");
        }

        const embed = new EmbedBuilder()
            .setColor("#9B59B6")
            .setTitle("Informasi Streaming Anime & Drama China")
            .setDescription(
                "Kami informasikan bahwa layanan streaming baru kini telah tersedia untuk diakses.\n\n" +
                "Anda dapat menikmati koleksi Drama China melalui tautan:\n" +
                "https://dracin.akhfhid.my.id\n\n" +
                "Serta layanan streaming Anime melalui tautan:\n" +
                "https://anime.akhfhid.my.id"
            )
            .addFields({
                name: "💡 Need Help?",
                value: "If you have any questions or encounter issues: Contact Owner: <@870115369174564914>",
                inline: false
            })
            .setFooter({ text: "akhfhid-bot • Your Privacy Matters" })
            .setTimestamp();


        let successCount = 0;
        let successServers = [];
        let failedServers = [];
        const guilds = client.guilds.cache.map(g => g);

        message.reply("Starting broadcast announcement...");

        for (const guild of guilds) {
            let channel = guild.systemChannel;
            if (!channel) {
                channel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has("SendMessages"));
            }

            if (channel) {
                try {
                    await channel.send({ embeds: [embed] });
                    successCount++;
                    successServers.push(guild.name);
                } catch (e) {
                    console.error(`Failed to send to server ${guild.name}:`, e);
                    failedServers.push(guild.name);
                }
            } else {
                failedServers.push(guild.name);
            }
        }

        const resultEmbed = new EmbedBuilder()
            .setColor(successCount > 0 ? "#00FF00" : "#FF0000")
            .setTitle("Broadcast Report")
            .setDescription(
                `**Status:** ${successCount > 0 ? "Completed" : "Failed"}\n` +
                `**Total Servers:** ${guilds.length}\n` +
                `**Success:** ${successCount} servers\n` +
                `**Failed:** ${failedServers.length} servers`
            )
            .addFields({
                name: `Successful Broadcasts (${successCount})`,
                value: successServers.length > 0
                    ? successServers.map(name => `\`${name}\``).join(", ")
                    : "None",
                inline: false
            })
            .setFooter({ text: `Broadcast completed at` })
            .setTimestamp();

        if (failedServers.length > 0) {
            resultEmbed.addFields({
                name: `Failed Broadcasts (${failedServers.length})`,
                value: failedServers.map(name => `\`${name}\``).join(", "),
                inline: false
            });
        }

        message.channel.send({ embeds: [resultEmbed] });
    }
};
