const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://sakuranovel.id";
const CORS_WORKER =
    "https://cloudflare-cors-anywhere.supershadowcube.workers.dev/?url=";

function normalizeImageUrl(raw) {
    if (!raw) return null;
    let src = String(raw).trim();
    if (!src) return null;

    if (src.includes(",")) {
        src = src.split(",")[0].trim();
    }
    if (src.includes(" ")) {
        src = src.split(" ")[0].trim();
    }
    src = src.replace(/\\\//g, "/");
    src = src.split("?")[0];

    if (src.startsWith("//")) {
        src = `https:${src}`;
    }

    if (src.startsWith("http://i0.wp.com/") || src.startsWith("https://i0.wp.com/")) {
        src = src.replace(/^https?:\/\/i0\.wp\.com\//, "https://");
    }

    return src || null;
}

class SakuraNovel {
    getHTML = async function (url, options = {}) {
        try {
            const { method = "GET", data = null, headers = {} } = options;

            const config = {
                method: method.toLowerCase(),
                url: `${CORS_WORKER}${url}`,
                headers: headers,
            };

            if (method.toUpperCase() === "POST" && data) {
                config.data = data;
            }

            const { data: html } = await axios(config);
            return cheerio.load(html);
        } catch (error) {
            throw new Error(error.message);
        }
    };

    search = async function (query) {
        try {
            if (!query) throw new Error("Query is required.");

            const $ = await this.getHTML(`${BASE_URL}/wp-admin/admin-ajax.php`, {
                method: "POST",
                data: new URLSearchParams({
                    action: "data_fetch",
                    keyword: query,
                }).toString(),
                headers: {
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    origin: BASE_URL,
                    referer: `${BASE_URL}/`,
                    "user-agent":
                        "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
                    "x-requested-with": "XMLHttpRequest",
                },
            });

            const results = $(".searchbox")
                .map((_, el) => {
                    const title =
                        $(el).find(".searchbox-title").text().trim() || null;
                    const cover = normalizeImageUrl(
                        $(el).find(".searchbox-thumb img").attr("src") ||
                            $(el).find(".searchbox-thumb img").attr("data-src") ||
                            $(el).find(".searchbox-thumb img").attr("srcset")
                    );
                    const type = $(el).find(".type").text().trim() || null;
                    const status = $(el).find(".status").text().trim() || null;
                    const url = $(el).find("a").attr("href") || null;
                    return {
                        title,
                        cover,
                        type,
                        status,
                        url,
                    };
                })
                .get();

            if (!results) throw new Error("No result found.");
            return results;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    detail = async function (url) {
        try {
            if (
                !/^https:\/\/sakuranovel\.id\/series\/[\w-]+\/?$/.test(url)
            ) {
                throw new Error(
                    "Invalid detail URL format. Expected format: https://sakuranovel.id/series/[series-slug]/"
                );
            }

            const $ = await this.getHTML(url);
            if ($(".series-titlex h2").length === 0) {
                throw new Error("Invalid series page or series not found.");
            }

            const title = $(".series-titlex h2").text().trim();
            const alternativeTitle = $(".series-titlex span").text().trim();
            const cover = normalizeImageUrl(
                $(".series-thumb img").attr("src") ||
                    $(".series-thumb img").attr("data-src") ||
                    $(".series-thumb img").attr("srcset")
            );
            const type = $(".series-infoz.block .type").text().trim() || "N/A";
            const status =
                $(".series-infoz.block .status").text().trim() || "N/A";
            const rating =
                $(".series-infoz.score span[itemprop=\"ratingValue\"]")
                    .text()
                    .trim() || "N/A";
            const bookmarks =
                parseInt($(".favcount span").text().trim(), 10) || 0;
            const getDetail = (label) => {
                const element = $(`.series-infolist li:contains("${label}")`);
                element.find("b").remove();
                return element.text().trim();
            };
            const genres = $(".series-genres a")
                .map((_, el) => $(el).text().trim())
                .get();
            const tags = $(".series-infolist li:contains(\"Tags\") a")
                .map((_, el) => $(el).text().trim())
                .get();
            const synopsis = $(".series-synops p")
                .map((_, el) => $(el).text().trim())
                .get()
                .join("\n\n");
            const chapters = $(".series-chapterlists li")
                .map((_, el) => {
                    const linkElement = $(el).find(".flexch-infoz a");
                    const chapterTitle = linkElement
                        .find("span")
                        .first()
                        .text()
                        .replace(/\s\s+/g, " ")
                        .replace(/ Bahasa Indonesia$/i, "")
                        .trim();
                    const chapterUrl = linkElement.attr("href");
                    const releaseDate = linkElement.find(".date").text().trim();
                    return {
                        title: chapterTitle,
                        url: chapterUrl,
                        releaseDate,
                    };
                })
                .get();

            return {
                title,
                alternative_title: alternativeTitle,
                cover,
                type,
                status,
                rating,
                bookmarks,
                country: getDetail("Country"),
                published: getDetail("Published"),
                author: getDetail("Author"),
                genres,
                tags,
                synopsis,
                chapters,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    chapter = async function (url) {
        try {
            if (
                !/^https:\/\/sakuranovel\.id\/(?!series\/)[\w-]+\d+[\w-]*\/?$/.test(
                    url
                )
            ) {
                throw new Error(
                    "Invalid chapter URL format. Expected format: https://sakuranovel.id/[series-slug]-ch-[number]-[chapter-title]/"
                );
            }

            const $ = await this.getHTML(url);
            if ($("h2.title-chapter").length === 0) {
                throw new Error("Invalid chapter page or chapter not found.");
            }

            const fullTitle = $("h2.title-chapter").text().trim();
            const chapterInfo = fullTitle
                .replace(/ Bahasa Indonesia$/i, "")
                .trim();

            const contentContainer = $(".tldariinggrissendiribrojangancopy");
            const images = contentContainer
                .find("img")
                .map((_, el) => {
                    let src =
                        $(el).attr("src") ||
                        $(el).attr("data-src") ||
                        $(el).attr("srcset");
                    return normalizeImageUrl(src);
                })
                .get()
                .filter(Boolean);

            const textContent = contentContainer
                .find("p")
                .map((_, el) => {
                    const text = $(el).text().trim();
                    if (
                        text &&
                        !text.includes("—Baca novel lain di sakuranovel—") &&
                        !text.includes("Baca novel lain di sakuranovel")
                    ) {
                        return text;
                    }
                    return null;
                })
                .get()
                .filter(Boolean)
                .join("\n\n");

            const navigation = {
                previousChapter:
                    $(".entry-pagination .pagi-prev a").attr("href") || null,
                tableOfContents:
                    $(".entry-pagination .pagi-toc a").attr("href") || null,
                nextChapter:
                    $(".entry-pagination .pagi-next a").attr("href") || null,
            };

            return {
                chapter_info: chapterInfo,
                content: textContent || null,
                images: images.length > 0 ? images : null,
                navigation,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };

    home = async function ({ page = 1 } = {}) {
        try {
            const targetUrl =
                page && Number(page) > 1
                    ? `${BASE_URL}/page/${Number(page)}`
                    : `${BASE_URL}/`;

            const $ = await this.getHTML(targetUrl);

            const random = $(".popular .flexbox .flexbox-item")
                .map((_, el) => {
                    const anchor = $(el).find("a").first();
                    const title = anchor.find(".flexbox-title").text().trim();
                    const url = anchor.attr("href") || null;
                    const cover = normalizeImageUrl(
                        anchor.find("img").attr("src") ||
                            anchor.find("img").attr("data-src") ||
                            anchor.find("img").attr("srcset")
                    );
                    return { title, url, cover };
                })
                .get();

            const latest = $(".flexbox3 .flexbox3-item")
                .map((_, el) => {
                    const seriesAnchor = $(el).find(".title a").first();
                    const title = seriesAnchor.text().trim();
                    const seriesUrl = seriesAnchor.attr("href") || null;
                    const cover =
                        normalizeImageUrl(
                            $(el).find(".flexbox3-thumb img").attr("src") ||
                                $(el).find(".flexbox3-thumb img").attr("data-src") ||
                                $(el).find(".flexbox3-thumb img").attr("srcset")
                        ) || null;
                    const chapters = $(el)
                        .find("ul.chapter li")
                        .map((__, li) => {
                            const chapterAnchor = $(li).find("a").first();
                            const chapterTitle = chapterAnchor
                                .text()
                                .replace(/ Bahasa Indonesia$/i, "")
                                .trim();
                            const chapterUrl = chapterAnchor.attr("href") || null;
                            const date = $(li).find(".date").text().trim();
                            return {
                                title: chapterTitle,
                                url: chapterUrl,
                                date,
                            };
                        })
                        .get();
                    return {
                        title,
                        url: seriesUrl,
                        cover,
                        chapters,
                    };
                })
                .get();

            return {
                page: Number(page) || 1,
                random,
                latest,
            };
        } catch (error) {
            throw new Error(error.message);
        }
    };
}

module.exports = SakuraNovel;
