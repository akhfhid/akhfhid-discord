const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { getMessageCount } = require("../utils/messageCounter");

const levelDataPath = path.join(__dirname, "../data/levels.json");
const ITEMS_PER_PAGE = 5;

function loadLevelData() {
    if (!fs.existsSync(levelDataPath)) return {};
    return JSON.parse(fs.readFileSync(levelDataPath, "utf8"));
}

function truncate(text, max) {
    if (!text) return "Unknown";
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function medalFor(rank) {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "🏅";
}

function makeProgressBar(current, max, size = 12) {
    if (!max || max <= 0) return "░".repeat(size);
    const ratio = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(ratio * size);
    return `${"█".repeat(filled)}${"░".repeat(size - filled)}`;
}

function buildLeaderboardEmbed(guildName, guildIcon, rows, page, totalPages) {
    const pageRows = rows.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
    const maxXp = Math.max(...rows.map((x) => x.xp), 1);

    const description = pageRows
        .map((row) => {
            const progress = makeProgressBar(row.xp, maxXp);
            return [
                `${medalFor(row.rank)} **#${row.rank} ${row.username}**`,
                `Lv ${row.level} • XP ${row.xp.toLocaleString("id-ID")} • Msg ${row.msgCount.toLocaleString("id-ID")}`,
                `\`${progress}\``,
            ].join("\n");
        })
        .join("\n\n");

    const topDetails = rows
        .slice(0, 7)
        .map(
            (r) =>
                `${medalFor(r.rank)} ${truncate(r.username, 14)} • Lv ${r.level} • XP ${r.xp.toLocaleString("id-ID")} • Msg ${r.msgCount.toLocaleString("id-ID")}`
        )
        .join("\n");

    const embed = new EmbedBuilder()
        .setColor("#FB7185")
        .setTitle(`Cute Leaderboard - ${guildName}`)
        .setDescription(description || "Data halaman ini kosong.")
        .addFields({
            name: "Chart Detail (Top 7)",
            value: topDetails || "-",
        })
        .setFooter({
            text: `Page ${page + 1}/${totalPages} • XP Party Top ${rows.length}`,
        })
        .setTimestamp();

    if (guildIcon) {
        embed.setThumbnail(guildIcon);
    }

    return embed;
}

function buildChartConfig(guildName, rows) {
    const topRows = rows.slice(0, 7);
    const labels = topRows.map((x) => truncate(x.username, 10));
    const xp = topRows.map((x) => x.xp);
    const lvl = topRows.map((x) => x.level);
    const msg = topRows.map((x) => x.msgCount);

    return {
        type: "bar",
        data: {
            labels,
            datasets: [
                {
                    label: "XP",
                    data: xp,
                    backgroundColor: "#fb7185",
                },
                {
                    label: "LVL",
                    data: lvl,
                    backgroundColor: "#60a5fa",
                },
                {
                    label: "MSG",
                    data: msg,
                    backgroundColor: "#34d399",
                },
            ],
        },
        options: {
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: `Top Stats - ${truncate(guildName, 20)}`,
                },
                subtitle: {
                    display: true,
                    text: "XP, Level, dan Message",
                },
            },
        },
    };
}

function chartUrl(guildName, rows) {
    const cfg = encodeURIComponent(JSON.stringify(buildChartConfig(guildName, rows)));
    return `https://quickchart.io/chart?width=900&height=420&format=png&backgroundColor=%230f172a&c=${cfg}`;
}

function renderButtons(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("lb_prev")
            .setLabel("Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId("lb_next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

function renderDisabledButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("lb_prev")
            .setLabel("Prev")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId("lb_next")
            .setLabel("Next")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    );
}

module.exports = {
    name: "leaderboard",
    alias: ["top", "lb"],
    description: "Menampilkan leaderboard level paling aktif dalam format card + slider",

    run: async (client, message) => {
        if (!message.guild) {
            return message.reply("Command ini hanya bisa dipakai di server.");
        }

        const levelData = loadLevelData();
        const guildId = message.guild.id;

        if (!levelData[guildId] || Object.keys(levelData[guildId]).length === 0) {
            const noDataEmbed = new EmbedBuilder()
                .setColor("#FF5733")
                .setTitle("Belum Ada Data")
                .setDescription("Belum ada data level di server ini. Mulai ngobrol untuk mendapatkan XP.");
            return message.reply({ embeds: [noDataEmbed] });
        }

        const sortedUsers = Object.entries(levelData[guildId])
            .sort(([, a], [, b]) => b.level - a.level || b.xp - a.xp)
            .slice(0, 20);

        const rows = [];
        for (let i = 0; i < sortedUsers.length; i++) {
            const [userId, data] = sortedUsers[i];
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) continue;

            rows.push({
                rank: i + 1,
                username: truncate(user.username.replace(/\s+/g, " ").trim(), 24),
                level: Number(data.level) || 0,
                xp: Number(data.xp) || 0,
                msgCount: getMessageCount(guildId, userId),
            });
        }

        if (!rows.length) {
            return message.reply("Gagal membaca user leaderboard. Coba lagi sebentar.");
        }

        const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
        let page = 0;

        const guildIcon = message.guild.iconURL({ dynamic: true, size: 512 });
        const baseEmbed = buildLeaderboardEmbed(
            message.guild.name,
            guildIcon,
            rows,
            page,
            totalPages
        );

        // Add image-based chart on first page to avoid clutter on every page.
        if (page === 0) {
            const imgUrl = chartUrl(message.guild.name, rows);
            if (imgUrl.length <= 1900) {
                baseEmbed.setImage(imgUrl);
            }
        }

        const sent = await message.reply({
            embeds: [baseEmbed],
            components: totalPages > 1 ? [renderButtons(page, totalPages)] : [],
        });

        if (totalPages <= 1) return;

        const collector = sent.createMessageComponentCollector({
            filter: (interaction) => interaction.user.id === message.author.id,
            time: 120000,
        });

        collector.on("collect", async (interaction) => {
            if (interaction.customId === "lb_prev") page = Math.max(0, page - 1);
            if (interaction.customId === "lb_next") page = Math.min(totalPages - 1, page + 1);

            const embed = buildLeaderboardEmbed(
                message.guild.name,
                guildIcon,
                rows,
                page,
                totalPages
            );

            if (page === 0) {
                const imgUrl = chartUrl(message.guild.name, rows);
                if (imgUrl.length <= 1900) {
                    embed.setImage(imgUrl);
                }
            }

            await interaction.update({
                embeds: [embed],
                components: [renderButtons(page, totalPages)],
            });
        });

        collector.on("end", async () => {
            try {
                await sent.edit({ components: [renderDisabledButtons()] });
            } catch {
                // Ignore when message no longer editable
            }
        });
    },
};
