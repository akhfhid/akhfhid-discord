const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

module.exports = (client) => {
    client.loadSlash = async () => {
        const slashDir = path.join(__dirname, "slash");

        client.slashCommands = new Map();

        const files = fs.readdirSync(slashDir).filter(f => f.endsWith(".js"));
        const slashData = [];

        for (const file of files) {
            delete require.cache[require.resolve(`./slash/${file}`)];
            const cmd = require(`./slash/${file}`);

            if (!cmd.data || !cmd.execute) continue;

            client.slashCommands.set(cmd.data.name, cmd);
            slashData.push(cmd.data.toJSON());
        }

        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

        try {
            const currentCommands = await rest.get(Routes.applicationCommands(client.user.id));
            const entryPointCommands = currentCommands.filter(cmd => cmd.type === 4);
            if (entryPointCommands.length > 0) {
                console.log(`Found ${entryPointCommands.length} Entry Point commands, preserving them.`);
                slashData.push(...entryPointCommands);
            }
        } catch (error) {
            console.error("Error fetching existing commands:", error);
        }

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashData }
        );

        console.log(`🔁 Slash commands updated (${slashData.length})`);
    };
};
