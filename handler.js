const fs = require("fs");
const path = require("path");
const chokidar = require('chokidar');

module.exports = (client) => {
    const pluginDir = path.join(__dirname, "plugins");

    const loadPlugins = () => {
        client.commands.clear();
        client.aliases.clear();
        if (!fs.existsSync(pluginDir)) {
            console.log("Direktori plugins tidak ditemukan, membuat direktori baru...");
            fs.mkdirSync(pluginDir);
            return;
        }
        const files = fs.readdirSync(pluginDir).filter(f => f.endsWith(".js"));
        if (files.length === 0) {
            console.log("Tidak ada plugin yang ditemukan di direktori plugins");
            return;
        }
        console.log(`Memuat ${files.length} plugin...`);

        files.forEach((file) => {
            try {
                delete require.cache[require.resolve(`./plugins/${file}`)];

                const plugin = require(`./plugins/${file}`);

                if (!plugin.name || !plugin.run) {
                    console.log(`✖ Plugin ${file} tidak valid (membutuhkan properti name dan run)`);
                    return;
                }

                console.log(`✔ Plugin loaded: ${plugin.name}`);
                client.commands.set(plugin.name, plugin);

                if (plugin.alias && Array.isArray(plugin.alias)) {
                    plugin.alias.forEach((a) => client.aliases.set(a, plugin));
                    console.log(`  ✓ Aliases: ${plugin.alias.join(", ")}`);
                }
            } catch (error) {
                console.error(`Error loading plugin ${file}:`, error);
            }
        });

        console.log(`Total plugin yang dimuat: ${client.commands.size}`);
    };

    loadPlugins();

    const watcher = chokidar.watch(pluginDir, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });

    watcher.on('change', (filepath) => {
        const filename = path.basename(filepath);
        if (filename.endsWith('.js')) {
            console.log(`Plugin ${filename} diperbarui, memuat ulang...`);
            loadPlugins();
        }
    });

    watcher.on('add', (filepath) => {
        const filename = path.basename(filepath);
        if (filename.endsWith('.js')) {
            console.log(`➕ Plugin baru ${filename} ditambahkan, memuat...`);
            loadPlugins();
        }
    });

    // Event saat file dihapus
    watcher.on('unlink', (filepath) => {
        const filename = path.basename(filepath);
        if (filename.endsWith('.js')) {
            console.log(`➖ Plugin ${filename} dihapus, memuat ulang...`);
            loadPlugins();
        }
    });

    return watcher;
};