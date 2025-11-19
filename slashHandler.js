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

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashData }
        );

        console.log(`🔁 Slash commands updated (${slashData.length})`);
    };
};
