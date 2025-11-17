const fs = require("fs");
const path = require("path");
const chokidar = require('chokidar');

const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`, 
    red: (text) => `\x1b[31m${text}\x1b[0m`,   
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    reset: () => `\x1b[0m`
};

module.exports = (client) => {
    const pluginDir = path.join(__dirname, "plugins");
    const pluginMap = new Map(); 
    const loadPlugin = (filepath) => {
        try {
            delete require.cache[require.resolve(filepath)];
            const plugin = require(filepath);

            if (!plugin.name || !plugin.run) {
                console.log(colors.red(`✖ Plugin ${path.basename(filepath)} tidak valid (membutuhkan properti 'name' dan 'run')`));
                return;
            }
            if (client.commands.has(plugin.name)) {
                const oldPlugin = client.commands.get(plugin.name);
                if (oldPlugin.alias) {
                    oldPlugin.alias.forEach(alias => client.aliases.delete(alias));
                }
            }

            client.commands.set(plugin.name, plugin);
            pluginMap.set(filepath, plugin.name);
            if (plugin.alias && Array.isArray(plugin.alias)) {
                plugin.alias.forEach((alias) => client.aliases.set(alias, plugin.name));
            }
            console.log(colors.green(`✔ Plugin dimuat: ${plugin.name}`));
            // if (plugin.alias && plugin.alias.length > 0) {
            //     console.log(colors.green(`  ✓ Alias: ${plugin.alias.join(", ")}`));
            // }

        } catch (error) {
            console.error(colors.red(`Error saat memuat plugin ${path.basename(filepath)}:`), error);
        }
    };
    const unloadPlugin = (filepath) => {
        const pluginName = pluginMap.get(filepath);
        if (!pluginName) {
            return;
        }

        const plugin = client.commands.get(pluginName);
        if (plugin) {
            client.commands.delete(pluginName);
            if (plugin.alias && Array.isArray(plugin.alias)) {
                plugin.alias.forEach(alias => client.aliases.delete(alias));
            }

            pluginMap.delete(filepath);
            console.log(colors.red(`➖ Plugin ${pluginName} (${path.basename(filepath)}) telah dihapus.`));
        }
    };
    const loadAllPlugins = () => {
        client.commands.clear();
        client.aliases.clear();
        pluginMap.clear();

        if (!fs.existsSync(pluginDir)) {
            console.log(colors.yellow("Direktori 'plugins' tidak ditemukan, membuat direktori baru..."));
            fs.mkdirSync(pluginDir, { recursive: true });
            return;
        }

        const files = fs.readdirSync(pluginDir).filter(f => f.endsWith(".js"));
        if (files.length === 0) {
            console.log(colors.yellow("Tidak ada plugin yang ditemukan di direktor"));
            return;
        }

        console.log(colors.yellow(`Memuat ${files.length} plugin...`));
        files.forEach((file) => {
            const filepath = path.join(pluginDir, file);
            loadPlugin(filepath);
        });

        console.log(colors.yellow(`Total plugin : ${client.commands.size}`));
    };

    loadAllPlugins();
    const watcher = chokidar.watch(pluginDir, {
        ignored: /(^|[\/\\])\../, 
        persistent: true
    });

    watcher.on('add', (filepath) => {
        if (filepath.endsWith('.js')) {
            console.log(colors.green(`➕ Plugin baru ${path.basename(filepath)} ditambahkan.`));
            loadPlugin(filepath);
        }
    });

    watcher.on('change', (filepath) => {
        if (filepath.endsWith('.js')) {
            console.log(colors.green(`🔄 Plugin ${path.basename(filepath)} diperbarui, memuat ulang...`));
            loadPlugin(filepath);
        }
    });

    watcher.on('unlink', (filepath) => {
        if (filepath.endsWith('.js')) {
            console.log(colors.red(`➖ Plugin ${path.basename(filepath)} dihapus.`));
            unloadPlugin(filepath);
        }
    });

    return watcher;
};