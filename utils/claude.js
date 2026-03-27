const axios = require("axios");
const { randomUUID } = require("crypto");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
require("dotenv").config();

const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const MAX_IMAGES = Number(process.env.CLAUDE_MAX_IMAGES || 2);
const MAX_PROMPT = Number(process.env.CLAUDE_MAX_PROMPT || 2500);
const CLAUDE_ORIGIN = "https://claude.ai";

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} belum di-set di environment`);
    }
    return value;
}

function buildCookieString() {
    if (process.env.CLAUDE_COOKIE_STRING) {
        return process.env.CLAUDE_COOKIE_STRING;
    }

    const raw = process.env.CLAUDE_COOKIES;
    if (!raw) {
        throw new Error("Set CLAUDE_COOKIE_STRING atau CLAUDE_COOKIES (JSON array)");
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        throw new Error(`CLAUDE_COOKIES bukan JSON valid: ${error.message}`);
    }

    if (!Array.isArray(parsed)) {
        throw new Error("CLAUDE_COOKIES harus berupa array");
    }

    return parsed
        .filter((c) => c && c.name && c.value)
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");
}

function buildBaseHeaders() {
    const anonId = requireEnv("CLAUDE_ANON_ID");
    const deviceId = requireEnv("CLAUDE_DEVICE_ID");
    const cookieString = buildCookieString();

    return {
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        "anthropic-anonymous-id": anonId,
        "anthropic-client-platform": "web_claude_ai",
        "anthropic-client-sha":
            process.env.CLAUDE_CLIENT_SHA || "456b13de6bf5c5013fd09fbfc657137b90de112a",
        "anthropic-client-version": process.env.CLAUDE_CLIENT_VERSION || "1.0.0",
        "anthropic-device-id": deviceId,
        "cache-control": "no-cache",
        cookie: cookieString,
        origin: CLAUDE_ORIGIN,
        pragma: "no-cache",
        "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent":
            process.env.CLAUDE_USER_AGENT ||
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    };
}

async function createConversation(orgId, headers) {
    const convId = randomUUID();
    const res = await axios.post(
        `${CLAUDE_ORIGIN}/api/organizations/${orgId}/chat_conversations`,
        {
            uuid: convId,
            name: "",
            enabled_imagine: true,
            include_conversation_preferences: true,
            is_temporary: false,
        },
        {
            headers: {
                ...headers,
                "content-type": "application/json",
                referer: `${CLAUDE_ORIGIN}/new`,
            },
            decompress: true,
        }
    );
    return res.data.uuid;
}

async function uploadFile(orgId, convId, filePath, headers) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    const mimeMap = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    };
    const mimeType = mimeMap[ext] || "application/octet-stream";

    const form = new FormData();
    form.append("file", fileBuffer, { filename: fileName, contentType: mimeType });

    const res = await axios.post(
        `${CLAUDE_ORIGIN}/api/organizations/${orgId}/conversations/${convId}/wiggle/upload-file`,
        form,
        {
            headers: {
                ...headers,
                ...form.getHeaders(),
                referer: `${CLAUDE_ORIGIN}/new`,
            },
            decompress: true,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        }
    );
    return res.data.file_uuid;
}

async function sendMessage(orgId, convId, prompt, headers, fileUuids = []) {
    const humanUuid = randomUUID();
    const assistantUuid = randomUUID();
    const timezone = process.env.CLAUDE_TIMEZONE || "Asia/Jakarta";

    const payload = {
        prompt,
        timezone,
        personalized_styles: [
            {
                isDefault: true,
                key: "Default",
                name: "Normal",
                nameKey: "normal_style_name",
                prompt: "Normal\n",
                summary: "Default responses from Claude",
                summaryKey: "normal_style_summary",
                type: "default",
            },
        ],
        locale: "en-US",
        attachments: [],
        files: fileUuids,
        model: MODEL,
        rendering_mode: "messages",
        sync_sources: [],
        tools: [],
        turn_message_uuids: {
            human_message_uuid: humanUuid,
            assistant_message_uuid: assistantUuid,
        },
    };

    const res = await axios.post(
        `${CLAUDE_ORIGIN}/api/organizations/${orgId}/chat_conversations/${convId}/completion`,
        payload,
        {
            headers: {
                ...headers,
                accept: "text/event-stream",
                "content-type": "application/json",
                referer: `${CLAUDE_ORIGIN}/chat/${convId}`,
            },
            responseType: "stream",
            decompress: true,
        }
    );

    return new Promise((resolve, reject) => {
        let fullText = "";
        let buffer = "";

        res.data.on("data", (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const raw = line.slice(6).trim();
                if (!raw || raw === "[DONE]") continue;

                try {
                    const evt = JSON.parse(raw);
                    if (
                        evt.type === "content_block_delta" &&
                        evt.delta?.type === "text_delta"
                    ) {
                        fullText += evt.delta.text;
                    }
                } catch {
                    // Ignore malformed stream lines and continue collecting text.
                }
            }
        });

        res.data.on("end", () => resolve(fullText.trim()));
        res.data.on("error", reject);
    });
}

async function claude(query, imagePaths = []) {
    if (!query || !query.trim()) {
        throw new Error("Prompt kosong");
    }

    if (query.length > MAX_PROMPT) {
        query = query.slice(0, MAX_PROMPT);
    }

    if (imagePaths.length > MAX_IMAGES) {
        throw new Error(`Max ${MAX_IMAGES} gambar, kamu kasih ${imagePaths.length}`);
    }

    const orgId = requireEnv("CLAUDE_ORG_ID");
    const headers = buildBaseHeaders();
    const convId = await createConversation(orgId, headers);

    const fileUuids = [];
    for (const imgPath of imagePaths) {
        const uuid = await uploadFile(orgId, convId, imgPath, headers);
        fileUuids.push(uuid);
    }

    const reply = await sendMessage(orgId, convId, query, headers, fileUuids);
    return {
        result: reply,
        conversationId: convId,
        model: MODEL,
    };
}

module.exports = claude;
