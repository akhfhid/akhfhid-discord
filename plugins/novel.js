const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const SakuraNovel = require("../utils/sakuranovel");

const novelChannelsPath = path.join(__dirname, "../data/novelChannels.json");
const novelUserDataPath = path.join(__dirname, "../data/novelUserData.json");

const MAX_OPTIONS = 25;
const CHAPTERS_PER_PAGE = 25;
const TEXT_PAGE_SIZE = 1800;
const COLLECTOR_MS = 10 * 60 * 1000;

let novelChannels = {};
if (fs.existsSync(novelChannelsPath)) {
    try {
        novelChannels = JSON.parse(fs.readFileSync(novelChannelsPath, "utf8"));
    } catch {
        novelChannels = {};
    }
}

let novelUserData = {};
if (fs.existsSync(novelUserDataPath)) {
    try {
        novelUserData = JSON.parse(fs.readFileSync(novelUserDataPath, "utf8"));
    } catch {
        novelUserData = {};
    }
}

function saveChannels() {
    fs.writeFileSync(novelChannelsPath, JSON.stringify(novelChannels, null, 2));
}

function saveNovelUserData() {
    fs.writeFileSync(novelUserDataPath, JSON.stringify(novelUserData, null, 2));
}

function normalizeUrl(url) {
    return String(url || "").trim().replace(/\/+$/, "");
}

function getUserBucket(userId) {
    if (!novelUserData[userId]) {
        novelUserData[userId] = {
            recent: [],
            bookmarks: [],
            progress: {},
        };
    }
    return novelUserData[userId];
}

function addRecent(userId, entry) {
    const bucket = getUserBucket(userId);
    const url = normalizeUrl(entry.url);
    if (!url) return;

    bucket.recent = (bucket.recent || []).filter((v) => normalizeUrl(v.url) !== url);
    bucket.recent.unshift({
        title: entry.title || "Untitled",
        url,
        at: Date.now(),
    });
    bucket.recent = bucket.recent.slice(0, 20);
    saveNovelUserData();
}

function toggleBookmark(userId, entry) {
    const bucket = getUserBucket(userId);
    const url = normalizeUrl(entry.url);
    if (!url) return false;

    const existingIndex = (bucket.bookmarks || []).findIndex((v) => normalizeUrl(v.url) === url);
    if (existingIndex >= 0) {
        bucket.bookmarks.splice(existingIndex, 1);
        saveNovelUserData();
        return false;
    }

    bucket.bookmarks.unshift({
        title: entry.title || "Untitled",
        url,
        at: Date.now(),
    });
    bucket.bookmarks = bucket.bookmarks.slice(0, 100);
    saveNovelUserData();
    return true;
}

function isBookmarked(userId, seriesUrl) {
    const bucket = getUserBucket(userId);
    const url = normalizeUrl(seriesUrl);
    return (bucket.bookmarks || []).some((v) => normalizeUrl(v.url) === url);
}

function setProgress(userId, payload) {
    const bucket = getUserBucket(userId);
    const seriesUrl = normalizeUrl(payload.seriesUrl);
    const chapterUrl = normalizeUrl(payload.chapterUrl);
    if (!seriesUrl || !chapterUrl) return;

    bucket.progress[seriesUrl] = {
        seriesTitle: payload.seriesTitle || "Untitled",
        chapterUrl,
        chapterTitle: payload.chapterTitle || "Chapter",
        at: Date.now(),
    };
    saveNovelUserData();
}

function getProgress(userId, seriesUrl) {
    const bucket = getUserBucket(userId);
    return bucket.progress?.[normalizeUrl(seriesUrl)] || null;
}

function truncate(text, max) {
    if (!text) return "";
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3))}...`;
}

function chunkArray(items, size) {
    const groups = [];
    for (let i = 0; i < items.length; i += size) {
        groups.push(items.slice(i, i + size));
    }
    return groups;
}

function chunkText(text, max = TEXT_PAGE_SIZE) {
    const raw = (text || "").trim();
    if (!raw) return ["Konten tidak tersedia."];

    const paragraphs = raw.split(/\n\s*\n/).map((v) => v.trim()).filter(Boolean);
    const pages = [];
    let current = "";

    for (const p of paragraphs) {
        if (p.length > max) {
            if (current) {
                pages.push(current);
                current = "";
            }
            for (let i = 0; i < p.length; i += max) {
                pages.push(p.slice(i, i + max));
            }
            continue;
        }

        const next = current ? `${current}\n\n${p}` : p;
        if (next.length > max) {
            if (current) pages.push(current);
            current = p;
        } else {
            current = next;
        }
    }

    if (current) pages.push(current);
    return pages.length ? pages : ["Konten tidak tersedia."];
}

function ensureChannelAllowed(message) {
    const channelId = novelChannels[message.guild.id];
    if (!channelId) {
        return {
            ok: false,
            reason:
                "Channel baca-novel belum diset. Admin bisa set dengan `!novel set #channel`.",
        };
    }
    if (message.channel.id !== channelId) {
        return {
            ok: false,
            reason: `Perintah baca-novel hanya bisa dipakai di <#${channelId}>.`,
        };
    }
    return { ok: true, channelId };
}

function createSeriesEmbed(state, requesterTag) {
    const preview = state.seriesList
        .slice(0, 10)
        .map((item, idx) => `${idx + 1}. ${truncate(item.title || "Untitled", 90)}`)
        .join("\n");

    const title =
        state.mode === "home"
            ? `SakuraNovel Home - Page ${state.homePage}`
            : state.mode === "recent"
              ? "Novel Recent"
              : state.mode === "bookmark"
                ? "Novel Bookmark"
                : `Novel Search: ${truncate(state.query, 60)}`;

    const embed = new EmbedBuilder()
        .setColor("#2F80ED")
        .setTitle(title)
        .setDescription(`${preview || "Tidak ada data."}\n\nPilih judul dari menu di bawah.`)
        .setFooter({ text: `Requested by ${requesterTag}` })
        .setTimestamp();

    if (state.seriesList[0]?.cover) {
        embed.setThumbnail(state.seriesList[0].cover);
    }

    return embed;
}

function buildCurrentPagePreview(state) {
    const group = state.chapterGroups[state.chapterPageIndex] || [];
    if (!group.length) return "Belum ada chapter.";

    const lines = [];
    let used = 0;

    for (let i = 0; i < group.length; i++) {
        const line = `• ${truncate(group[i].title || "-", 92)}`;
        if (used + line.length + 1 > 950) break;
        lines.push(line);
        used += line.length + 1;
    }

    return lines.join("\n") || "Belum ada chapter.";
}

function createDetailEmbed(state, requesterTag) {
    const detail = state.detail || {};

    const embed = new EmbedBuilder()
        .setColor("#2F80ED")
        .setTitle(truncate(detail.title || "Detail Novel", 250))
        .setURL(state.selectedSeries?.url || null)
        .setDescription(truncate(detail.synopsis || "Sinopsis tidak tersedia.", 1300))
        .addFields(
            { name: "Type", value: detail.type || "-", inline: true },
            { name: "Status", value: detail.status || "-", inline: true },
            { name: "Rating", value: detail.rating || "-", inline: true },
            { name: "Author", value: truncate(detail.author || "-", 120), inline: true },
            { name: "Country", value: truncate(detail.country || "-", 120), inline: true },
            { name: "Published", value: truncate(detail.published || "-", 120), inline: true },
            {
                name: `Chapter Page ${state.chapterPageIndex + 1}/${Math.max(1, state.chapterGroups.length)}`,
                value: buildCurrentPagePreview(state),
                inline: false,
            }
        )
        .setFooter({ text: `Requested by ${requesterTag} | Bookmarks: ${detail.bookmarks || 0}` })
        .setTimestamp();

    if (detail.cover) embed.setThumbnail(detail.cover);
    return embed;
}

function createChapterEmbed(state, requesterTag) {
    const chapter = state.currentChapter || {};
    const nav = chapter.navigation || {};
    const page = state.chapterTextIndex + 1;
    const total = Math.max(1, state.chapterTextPages.length);
    const text = state.chapterTextPages[state.chapterTextIndex] || "Konten tidak tersedia.";

    const embed = new EmbedBuilder()
        .setColor("#2F80ED")
        .setTitle(truncate(chapter.chapter_info || state.currentChapterTitle || "Chapter", 250))
        .setURL(state.currentChapterUrl || null)
        .setDescription(`${text}\n\n**Halaman Teks:** ${page}/${total}`)
        .addFields({
            name: "Navigasi Chapter",
            value:
                `Prev: ${nav.previousChapter ? "Tersedia" : "Tidak ada"}\n` +
                `TOC: ${nav.tableOfContents ? "Tersedia" : "Tidak ada"}\n` +
                `Next: ${nav.nextChapter ? "Tersedia" : "Tidak ada"}`,
            inline: false,
        })
        .setFooter({ text: `Requested by ${requesterTag}` })
        .setTimestamp();

    if (chapter.images?.length) embed.setImage(chapter.images[0]);
    return embed;
}

function createSeriesRow(state) {
    const options = state.seriesList.slice(0, MAX_OPTIONS).map((item, idx) => ({
        label: truncate(item.title || `Novel ${idx + 1}`, 100),
        description: truncate(item.meta || "Pilih untuk lihat detail", 100),
        value: String(idx),
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("novelSelectSeries")
            .setPlaceholder("Pilih novel")
            .addOptions(options)
    );
}

function createChapterPageRow(state) {
    if (!state.chapterGroups.length) return null;

    const options = state.chapterGroups.map((group, idx) => ({
        label: `Chapter ${idx * CHAPTERS_PER_PAGE + 1}-${idx * CHAPTERS_PER_PAGE + group.length}`,
        value: String(idx),
        default: idx === state.chapterPageIndex,
    }));

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("novelSelectChapterPage")
            .setPlaceholder("Pilih halaman chapter")
            .addOptions(options)
    );
}

function createChapterRow(state) {
    const current = state.chapterGroups[state.chapterPageIndex] || [];
    if (!current.length) return null;

    const options = current.map((chapter, idx) => {
        return {
            label: truncate(chapter.title || `Chapter ${idx + 1}`, 100),
            description: truncate(chapter.releaseDate || "Pilih chapter", 100),
            value: String(idx),
            default: current[idx]?.url === state.currentChapterUrl,
        };
    });

    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("novelSelectChapter")
            .setPlaceholder("Pilih chapter")
            .addOptions(options)
    );
}

function createDetailRows(state, isMarked, hasProgress) {
    const rows = [];
    const pageRow = createChapterPageRow(state);
    const chapterRow = createChapterRow(state);
    if (pageRow) rows.push(pageRow);
    if (chapterRow) rows.push(chapterRow);
    rows.push(
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("novelToggleBookmark")
                .setLabel(isMarked ? "Unbookmark" : "Bookmark")
                .setStyle(isMarked ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("novelContinueProgress")
                .setLabel("Lanjut Terakhir")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!hasProgress),
            new ButtonBuilder()
                .setCustomId("novelBackSeries")
                .setLabel("Kembali ke list")
                .setStyle(ButtonStyle.Secondary)
        )
    );
    return rows;
}

function createChapterRows(state, isMarked) {
    const nav = state.currentChapter?.navigation || {};
    const rows = [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("novelTextPrev")
                .setLabel("Text Prev")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(state.chapterTextIndex <= 0),
            new ButtonBuilder()
                .setCustomId("novelTextNext")
                .setLabel("Text Next")
                .setStyle(ButtonStyle.Primary)
                .setDisabled(state.chapterTextIndex >= state.chapterTextPages.length - 1),
            new ButtonBuilder()
                .setCustomId("novelBackDetail")
                .setLabel("Pilih chapter lagi")
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("novelChapterPrev")
                .setLabel("Prev Chapter")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!nav.previousChapter),
            new ButtonBuilder()
                .setCustomId("novelChapterNext")
                .setLabel("Next Chapter")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!nav.nextChapter),
            new ButtonBuilder()
                .setCustomId("novelToggleBookmark")
                .setLabel(isMarked ? "Unbookmark" : "Bookmark")
                .setStyle(isMarked ? ButtonStyle.Danger : ButtonStyle.Success)
        ),
    ];

    const pageRow = createChapterPageRow(state);
    const chapterRow = createChapterRow(state);
    if (pageRow) rows.push(pageRow);
    if (chapterRow) rows.push(chapterRow);
    return rows;
}

module.exports = {
    name: "novel",
    alias: ["sakuranovel", "baca", "bacanovel"],
    description: "Baca novel dari sakuranovel.id",
    run: async (client, message, args) => {
        if (!message.guild) {
            return message.reply("Command `!novel` hanya bisa dipakai di server.");
        }

        const sub = (args.shift() || "").toLowerCase();
        const isAdmin =
            message.member?.permissions?.has("Administrator") ||
            message.member?.permissions?.has("ManageGuild");

        if (!sub || sub === "help") {
            return message.reply(
                "Gunakan: `!novel set #channel`, `!novel disable`, `!novel channel`, `!novel home [page]`, `!novel search <query>`, `!novel recent`, `!novel bookmarks`, atau `!novel <query>`."
            );
        }

        if (sub === "set") {
            if (!isAdmin) {
                return message.reply("Hanya admin yang bisa set channel baca-novel.");
            }
            const mentioned = message.mentions.channels.first();
            if (!mentioned) {
                return message.reply("Sertakan channel. Contoh: `!novel set #baca-novel`");
            }
            novelChannels[message.guild.id] = mentioned.id;
            saveChannels();
            return message.reply(`Channel baca-novel diset ke ${mentioned.toString()}.`);
        }

        if (sub === "disable") {
            if (!isAdmin) {
                return message.reply("Hanya admin yang bisa disable channel baca-novel.");
            }
            delete novelChannels[message.guild.id];
            saveChannels();
            return message.reply("Channel baca-novel dinonaktifkan.");
        }

        if (sub === "channel") {
            const channelId = novelChannels[message.guild.id];
            if (!channelId) {
                return message.reply("Channel baca-novel belum diset.");
            }
            return message.reply(`Channel baca-novel: <#${channelId}>`);
        }

        const allowed = ensureChannelAllowed(message);
        if (!allowed.ok) {
            return message.reply(allowed.reason);
        }

        const userId = message.author.id;
        const bucket = getUserBucket(userId);
        const sakura = new SakuraNovel();
        const requesterTag = message.author.tag;
        const state = {
            mode: "search",
            query: "",
            homePage: 1,
            seriesList: [],
            selectedSeries: null,
            detail: null,
            chapterGroups: [],
            chapterPageIndex: 0,
            currentChapterUrl: null,
            currentChapterTitle: null,
            currentChapter: null,
            chapterTextPages: ["Konten tidak tersedia."],
            chapterTextIndex: 0,
        };

        try {
            if (sub === "home") {
                const page = Number(args[0] || 1);
                const data = await sakura.home({ page });
                state.mode = "home";
                state.homePage = data.page || page || 1;
                state.seriesList = (data.latest || [])
                    .filter((item) => item.url)
                    .slice(0, MAX_OPTIONS)
                    .map((item) => ({
                        title: item.title,
                        cover: item.cover || null,
                        url: normalizeUrl(item.url),
                        meta: item.chapters?.[0]
                            ? `${item.chapters[0].title || "Update terbaru"} | ${item.chapters[0].date || "-"}`
                            : "Update terbaru",
                    }));
            } else if (sub === "recent") {
                state.mode = "recent";
                state.seriesList = (bucket.recent || []).slice(0, MAX_OPTIONS).map((v) => ({
                    title: v.title,
                    url: normalizeUrl(v.url),
                    meta: "Recent",
                }));
            } else if (sub === "bookmarks" || sub === "bookmark") {
                state.mode = "bookmark";
                state.seriesList = (bucket.bookmarks || []).slice(0, MAX_OPTIONS).map((v) => ({
                    title: v.title,
                    url: normalizeUrl(v.url),
                    meta: "Bookmarked",
                }));
            } else {
                const query =
                    sub === "search"
                        ? args.join(" ").trim()
                        : [sub, ...args].join(" ").trim();
                if (!query) {
                    return message.reply(
                        "Masukkan kata kunci. Contoh: `!novel search classroom of the elite` atau `!novel classroom`"
                    );
                }

                const results = await sakura.search(query);
                state.mode = "search";
                state.query = query;
                state.seriesList = (results || [])
                    .filter((item) => item.url)
                    .slice(0, MAX_OPTIONS)
                    .map((item) => ({
                        title: item.title,
                        cover: item.cover || null,
                        url: normalizeUrl(item.url),
                        meta: `${item.type || "Novel"} | ${item.status || "Unknown"}`,
                    }));
            }
        } catch (error) {
            return message.reply(`Gagal mengambil data novel: ${error.message}`);
        }

        if (!state.seriesList.length) {
            return message.reply("Data kosong. Coba cari judul lain atau mulai baca dulu untuk mengisi recent/bookmark.");
        }

        const panel = await message.reply({
            embeds: [createSeriesEmbed(state, requesterTag)],
            components: [createSeriesRow(state)],
        });

        const collector = panel.createMessageComponentCollector({
            time: COLLECTOR_MS,
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: "Ini bukan sesi kamu.", ephemeral: true });
            }

            try {
                if (!i.deferred && !i.replied) {
                    await i.deferUpdate();
                }

                const allChapters = state.detail?.chapters || [];
                const marked = isBookmarked(userId, state.selectedSeries?.url);
                const progress = getProgress(userId, state.selectedSeries?.url);

                if (i.customId === "novelSelectSeries") {
                    const idx = Number(i.values[0]);
                    const selected = state.seriesList[idx];
                    if (!selected?.url) return;

                    const detail = await sakura.detail(selected.url);
                    state.selectedSeries = selected;
                    state.detail = detail;
                    state.chapterGroups = chunkArray(detail.chapters || [], CHAPTERS_PER_PAGE);
                    state.chapterPageIndex = 0;
                    state.currentChapterUrl = null;
                    state.currentChapterTitle = null;
                    state.currentChapter = null;
                    state.chapterTextPages = ["Konten tidak tersedia."];
                    state.chapterTextIndex = 0;

                    addRecent(userId, {
                        title: detail.title || selected.title,
                        url: selected.url,
                    });

                    await panel.edit({
                        embeds: [createDetailEmbed(state, requesterTag)],
                        components: createDetailRows(
                            state,
                            isBookmarked(userId, state.selectedSeries?.url),
                            !!getProgress(userId, state.selectedSeries?.url)
                        ),
                    });
                    return;
                }

                if (i.customId === "novelToggleBookmark") {
                    if (!state.selectedSeries?.url) return;

                    toggleBookmark(userId, {
                        title: state.detail?.title || state.selectedSeries.title,
                        url: state.selectedSeries.url,
                    });

                    const isNowMarked = isBookmarked(userId, state.selectedSeries?.url);
                    const hasProgress = !!getProgress(userId, state.selectedSeries?.url);

                    if (state.currentChapter) {
                        await panel.edit({
                            embeds: [createChapterEmbed(state, requesterTag)],
                            components: createChapterRows(state, isNowMarked),
                        });
                    } else {
                        await panel.edit({
                            embeds: [createDetailEmbed(state, requesterTag)],
                            components: createDetailRows(state, isNowMarked, hasProgress),
                        });
                    }
                    return;
                }

                if (i.customId === "novelContinueProgress") {
                    const p = getProgress(userId, state.selectedSeries?.url);
                    if (!p?.chapterUrl) return;

                    const chapter = await sakura.chapter(p.chapterUrl);
                    state.currentChapter = chapter;
                    state.currentChapterUrl = p.chapterUrl;
                    state.currentChapterTitle = p.chapterTitle || null;
                    state.chapterTextPages = chunkText(chapter.content || "");
                    state.chapterTextIndex = 0;

                    await panel.edit({
                        embeds: [createChapterEmbed(state, requesterTag)],
                        components: createChapterRows(state, isBookmarked(userId, state.selectedSeries?.url)),
                    });
                    return;
                }

                if (i.customId === "novelSelectChapterPage") {
                    state.chapterPageIndex = Number(i.values[0]) || 0;
                    const payload = state.currentChapter
                        ? {
                              embeds: [createChapterEmbed(state, requesterTag)],
                              components: createChapterRows(state, marked),
                          }
                        : {
                              embeds: [createDetailEmbed(state, requesterTag)],
                              components: createDetailRows(state, marked, !!progress),
                          };
                    await panel.edit(payload);
                    return;
                }

                if (i.customId === "novelSelectChapter") {
                    const localIdx = Number(i.values[0]);
                    const currentGroup = state.chapterGroups[state.chapterPageIndex] || [];
                    const selectedChapter = currentGroup[localIdx];
                    if (!selectedChapter?.url) return;

                    const chapter = await sakura.chapter(selectedChapter.url);
                    state.currentChapter = chapter;
                    state.currentChapterUrl = selectedChapter.url;
                    state.currentChapterTitle = selectedChapter.title || null;
                    state.chapterTextPages = chunkText(chapter.content || "");
                    state.chapterTextIndex = 0;

                    setProgress(userId, {
                        seriesUrl: state.selectedSeries?.url,
                        seriesTitle: state.detail?.title || state.selectedSeries?.title,
                        chapterUrl: selectedChapter.url,
                        chapterTitle: selectedChapter.title || chapter.chapter_info,
                    });

                    await panel.edit({
                        embeds: [createChapterEmbed(state, requesterTag)],
                        components: createChapterRows(state, isBookmarked(userId, state.selectedSeries?.url)),
                    });
                    return;
                }

                if (i.customId === "novelTextPrev") {
                    if (state.chapterTextIndex > 0) state.chapterTextIndex -= 1;
                    await panel.edit({
                        embeds: [createChapterEmbed(state, requesterTag)],
                        components: createChapterRows(state, marked),
                    });
                    return;
                }

                if (i.customId === "novelTextNext") {
                    if (state.chapterTextIndex < state.chapterTextPages.length - 1) {
                        state.chapterTextIndex += 1;
                    }
                    await panel.edit({
                        embeds: [createChapterEmbed(state, requesterTag)],
                        components: createChapterRows(state, marked),
                    });
                    return;
                }

                if (i.customId === "novelBackDetail") {
                    await panel.edit({
                        embeds: [createDetailEmbed(state, requesterTag)],
                        components: createDetailRows(state, marked, !!progress),
                    });
                    return;
                }

                if (i.customId === "novelBackSeries") {
                    await panel.edit({
                        embeds: [createSeriesEmbed(state, requesterTag)],
                        components: [createSeriesRow(state)],
                    });
                    return;
                }

                if (i.customId === "novelChapterPrev" || i.customId === "novelChapterNext") {
                    if (!state.currentChapter) return;

                    const nav = state.currentChapter.navigation || {};
                    const target =
                        i.customId === "novelChapterPrev"
                            ? nav.previousChapter
                            : nav.nextChapter;
                    if (!target) return;

                    const chapter = await sakura.chapter(target);
                    state.currentChapter = chapter;
                    state.currentChapterUrl = normalizeUrl(target);
                    state.currentChapterTitle = chapter.chapter_info || null;
                    state.chapterTextPages = chunkText(chapter.content || "");
                    state.chapterTextIndex = 0;

                    const idx = allChapters.findIndex((c) => normalizeUrl(c.url) === normalizeUrl(target));
                    if (idx >= 0) {
                        state.chapterPageIndex = Math.floor(idx / CHAPTERS_PER_PAGE);
                        state.currentChapterTitle = allChapters[idx].title || state.currentChapterTitle;
                    }

                    setProgress(userId, {
                        seriesUrl: state.selectedSeries?.url,
                        seriesTitle: state.detail?.title || state.selectedSeries?.title,
                        chapterUrl: state.currentChapterUrl,
                        chapterTitle: state.currentChapterTitle || chapter.chapter_info,
                    });

                    await panel.edit({
                        embeds: [createChapterEmbed(state, requesterTag)],
                        components: createChapterRows(state, marked),
                    });
                }
            } catch (error) {
                console.error("Novel interaction error:", error);
                if (!i.replied && !i.deferred) {
                    await i.reply({
                        content: `Terjadi error: ${truncate(error.message || "Unknown error", 250)}`,
                        ephemeral: true,
                    });
                } else {
                    await i
                        .followUp({
                            content: `Terjadi error: ${truncate(error.message || "Unknown error", 250)}`,
                            ephemeral: true,
                        })
                        .catch(() => { });
                }
            }
        });

        collector.on("end", async () => {
            try {
                await panel.edit({ components: [] });
            } catch {
                // ignore
            }
        });
    },
};
