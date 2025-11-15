const fs = require("fs");
const { REST, Routes } = require("discord.js");

module.exports = async (client) => {
    const slashCommands = [];
    const files = fs.readdirSync("./plugins").filter(f => f.endsWith(".js"));

    for (const file of files) {
        const cmd = require(`./plugins/${file}`);
        if (cmd.slash) {
            client.slashCommands.set(cmd.name, cmd.slash);
            slashCommands.push(cmd.slash.data.toJSON());
        }
    }

    // Register slash commands
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    try {
        console.log("🔄 Deploying slash commands...");
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        console.log("✔ Slash commands deployed");
    } catch (err) {
        console.error(err);
    }

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const cmd = client.slashCommands.get(interaction.commandName);
        if (!cmd) return;

        await cmd.execute(interaction);
    });
};
