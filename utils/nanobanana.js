const https = require("https");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function req(options, body = null) {
    return new Promise((resolve, reject) => {
        const r = https.request(options, (res) => {
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () =>
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString("utf8"),
                })
            );
        });
        r.on("error", reject);
        if (body) r.write(body);
        r.end();
    });
}

function reqBuf(options, body = null) {
    return new Promise((resolve, reject) => {
        const r = https.request(options, (res) => {
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () =>
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks),
                })
            );
        });
        r.on("error", reject);
        if (body) r.write(body);
        r.end();
    });
}

function parseJsonSafe(text, context) {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Invalid JSON from ${context}: ${error.message}`);
    }
}

function pickCookie(setCookieHeader) {
    if (!Array.isArray(setCookieHeader)) return "";
    return setCookieHeader.map((c) => c.split(";")[0]).join("; ");
}

function fetchUrlBuffer(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) {
            reject(new Error("Too many redirects while downloading image"));
            return;
        }

        const parsed = new URL(url);
        const mod = parsed.protocol === "http:" ? http : https;
        const reqStream = mod.get(parsed, (res) => {
            if (
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location
            ) {
                const nextUrl = new URL(res.headers.location, parsed).toString();
                fetchUrlBuffer(nextUrl, redirects + 1).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download image. Status: ${res.statusCode}`));
                return;
            }

            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () =>
                resolve({
                    buffer: Buffer.concat(chunks),
                    finalUrl: parsed.toString(),
                })
            );
        });

        reqStream.on("error", reject);
    });
}

async function toLocalImage(imageInput) {
    if (!imageInput) {
        throw new Error("imagePath or imageUrl is required");
    }

    if (!/^https?:\/\//i.test(imageInput)) {
        if (!fs.existsSync(imageInput)) {
            throw new Error(`Image file not found: ${imageInput}`);
        }
        return { localPath: imageInput, cleanup: null };
    }

    const { buffer, finalUrl } = await fetchUrlBuffer(imageInput);
    const fromPath = path.extname(new URL(finalUrl).pathname).toLowerCase();
    const ext =
        fromPath && [".jpg", ".jpeg", ".png", ".webp"].includes(fromPath)
            ? fromPath
            : ".jpg";
    const tempPath = path.join(
        os.tmpdir(),
        `nanobanana-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    );
    fs.writeFileSync(tempPath, buffer);

    return {
        localPath: tempPath,
        cleanup: () => fs.unlink(tempPath, () => {}),
    };
}

async function nanobanana(input) {
    const { prompt } = input || {};
    const imageInput = input?.imagePath || input?.imageUrl;
    if (!prompt || !prompt.trim()) {
        throw new Error("prompt is required");
    }

    const { localPath, cleanup } = await toLocalImage(imageInput);

    try {
        const TM = {
            "Content-Type": "application/json",
            "Application-Name": "web",
            "Application-Version": "4.0.0",
            "X-CORS-Header": "iaWg3pchvFx48fY",
        };

        const tmNew = await req(
            {
                hostname: "api.internal.temp-mail.io",
                path: "/api/v3/email/new",
                method: "POST",
                headers: TM,
            },
            JSON.stringify({ min_name_length: 10, max_name_length: 10 })
        );
        const { email, token } = parseJsonSafe(tmNew.body, "temp-mail/new");

        await req(
            {
                hostname: "www.nanobana.net",
                path: "/api/auth/email/send",
                method: "POST",
                headers: { "Content-Type": "application/json" },
            },
            JSON.stringify({ email })
        );

        let code = null;
        for (let i = 0; i < 15; i++) {
            await sleep(3000);
            const inbox = await req({
                hostname: "api.internal.temp-mail.io",
                path: `/api/v3/email/${email}/messages`,
                method: "GET",
                headers: { ...TM, "X-Mail-Token": token },
            });
            const msgs = parseJsonSafe(inbox.body, "temp-mail/messages");
            if (Array.isArray(msgs) && msgs.length > 0) {
                const m = msgs[0]?.subject?.match(/\d{6}/);
                if (m) {
                    code = m[0];
                    break;
                }
            }
        }
        if (!code) throw new Error("Code not received from temp-mail");

        const csrfRes = await req({
            hostname: "www.nanobana.net",
            path: "/api/auth/csrf",
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const { csrfToken } = parseJsonSafe(csrfRes.body, "nanobana/csrf");
        const csrfCookies = pickCookie(csrfRes.headers["set-cookie"]);

        const payload = new URLSearchParams({
            email,
            code,
            redirect: "false",
            csrfToken,
            callbackUrl: "https://www.nanobana.net/",
        }).toString();

        const loginRes = await req(
            {
                hostname: "www.nanobana.net",
                path: "/api/auth/callback/email-code?",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(payload),
                    Cookie: csrfCookies,
                    Origin: "https://www.nanobana.net",
                    Referer: "https://www.nanobana.net/",
                    "X-Auth-Return-Redirect": "1",
                },
            },
            payload
        );

        const loginCookies = pickCookie(loginRes.headers["set-cookie"]);
        const sessionCookies = [csrfCookies, loginCookies].filter(Boolean).join("; ");
        if (!sessionCookies) {
            throw new Error("Login failed: no session cookies returned");
        }

        const fileBuffer = fs.readFileSync(localPath);
        const filename = path.basename(localPath);
        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).slice(2);
        const ext = path.extname(filename).toLowerCase();
        const mime =
            ext === ".png"
                ? "image/png"
                : ext === ".webp"
                ? "image/webp"
                : "image/jpeg";

        const pre = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`
        );
        const post = Buffer.from(`\r\n--${boundary}--\r\n`);
        const multipart = Buffer.concat([pre, fileBuffer, post]);

        const uploadRes = await reqBuf(
            {
                hostname: "www.nanobana.net",
                path: "/api/upload/image",
                method: "POST",
                headers: {
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "Content-Length": multipart.length,
                    Cookie: sessionCookies,
                    Origin: "https://www.nanobana.net",
                    Referer: "https://www.nanobana.net/",
                    "X-Original-Size": String(fileBuffer.length),
                },
            },
            multipart
        );

        const { url: imageUrl } = parseJsonSafe(
            uploadRes.body.toString("utf8"),
            "nanobana/upload"
        );
        if (!imageUrl) throw new Error("Upload failed: image URL not returned");

        const genBody = JSON.stringify({
            prompt,
            aspect_ratio: "1:1",
            image_input: [imageUrl],
            output_format: "png",
            resolution: "1K",
        });

        const genRes = await req(
            {
                hostname: "www.nanobana.net",
                path: "/api/nano-banana-pro/generate",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(genBody),
                    Cookie: sessionCookies,
                    Origin: "https://www.nanobana.net",
                    Referer: "https://www.nanobana.net/",
                },
            },
            genBody
        );

        const genData = parseJsonSafe(genRes.body, "nanobana/generate");
        const taskId = genData?.data?.taskId;
        if (!taskId) throw new Error("Generation failed: taskId not found");

        let result = null;
        const encodedPrompt = encodeURIComponent(prompt);
        for (let i = 0; i < 30; i++) {
            await sleep(3000);
            const taskRes = await req({
                hostname: "www.nanobana.net",
                path: `/api/nano-banana-pro/task/${taskId}?save=1&prompt=${encodedPrompt}`,
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: sessionCookies,
                    Referer: "https://www.nanobana.net/",
                },
            });

            const taskData = parseJsonSafe(taskRes.body, "nanobana/task");
            const status = taskData?.data?.status;
            if (status === "completed") {
                result = taskData;
                break;
            }
            if (status === "failed" || status === "error") {
                throw new Error(`Generation failed with status: ${status}`);
            }
        }

        if (!result) throw new Error("Generation timeout: task not completed");
        return result;
    } finally {
        if (typeof cleanup === "function") cleanup();
    }
}

module.exports = nanobanana;
