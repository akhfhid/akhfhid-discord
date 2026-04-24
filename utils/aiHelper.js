const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const SESSION_BLOCKED_PREFIXES = ["system-", "schedule-"];
const SESSION_FILE =
    process.env.AI_SESSION_FILE ||
    path.join(__dirname, "..", "data", "ai_sessions.json");
const SAVE_DEBOUNCE_MS = Number(process.env.AI_SESSION_SAVE_MS || 2000);

const sessionState = new Map();
let saveTimer = null;

function buildSessionKey(userId, guildId = null, scope = "chat") {
    const safeScope = String(scope || "chat").trim() || "chat";
    const safeUser = String(userId || "").trim();
    const safeGuild = guildId ? String(guildId) : "dm";
    if (!safeUser) return `${safeScope}-${safeGuild}-anonymous`;
    return `${safeScope}-${safeGuild}-${safeUser}`;
}

function sessionsEnabled() {
    return (process.env.AI_SESSION_ENABLED || "true").toLowerCase() !== "false";
}

function isSessionEligible(sessionId) {
    if (!sessionsEnabled()) return false;
    if (!sessionId) return false;
    const id = String(sessionId);
    return !SESSION_BLOCKED_PREFIXES.some((p) => id.startsWith(p));
}

function normalizeState(value) {
    if (!value) return { sessionId: null, turns: 0 };

    if (Array.isArray(value)) {
        // Backward compatibility from old message-history format
        return {
            sessionId: null,
            turns: Math.ceil(value.length / 2),
        };
    }

    if (typeof value === "object") {
        return {
            sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
            turns: Number.isFinite(value.turns) && value.turns > 0 ? value.turns : 0,
        };
    }

    return { sessionId: null, turns: 0 };
}

function loadSessionsFromDisk() {
    if (!sessionsEnabled()) return;
    if (!fs.existsSync(SESSION_FILE)) return;

    try {
        const raw = fs.readFileSync(SESSION_FILE, "utf-8");
        if (!raw.trim()) return;

        const parsed = JSON.parse(raw);
        const sessions = parsed?.sessions || parsed;
        if (!sessions || typeof sessions !== "object") return;

        for (const [id, state] of Object.entries(sessions)) {
            sessionState.set(String(id), normalizeState(state));
        }
    } catch (error) {
        console.error("Failed to load AI sessions:", error?.message || error);
    }
}

function saveSessionsToDisk() {
    if (!sessionsEnabled()) return;

    try {
        const dir = path.dirname(SESSION_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const sessions = {};
        for (const [id, state] of sessionState.entries()) {
            sessions[id] = {
                sessionId: state.sessionId || null,
                turns: Number(state.turns) || 0,
            };
        }

        const payload = {
            version: 2,
            updatedAt: new Date().toISOString(),
            sessions,
        };

        fs.writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2));
    } catch (error) {
        console.error("Failed to save AI sessions:", error?.message || error);
    }
}

function scheduleSave() {
    if (!sessionsEnabled()) return;
    if (saveTimer) return;

    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveSessionsToDisk();
    }, SAVE_DEBOUNCE_MS);
}

function getSessionState(sessionId) {
    const id = String(sessionId);
    const existing = sessionState.get(id);
    if (existing) return existing;
    const fresh = { sessionId: null, turns: 0 };
    sessionState.set(id, fresh);
    return fresh;
}

function parseGeminiText(data) {
    const chunks = Array.from(String(data || "").matchAll(/^\d+\n(.+?)\n/gm));
    if (!chunks.length) throw new Error("Gemini response chunk not found.");

    for (let i = chunks.length - 1; i >= 0; i--) {
        try {
            const candidate = chunks[i][1];
            const realArray = JSON.parse(candidate);
            if (!realArray?.[0]?.[2]) continue;
            const parse1 = JSON.parse(realArray[0][2]);

            const text = parse1?.[4]?.[0]?.[1]?.[0];
            const baseResume = parse1?.[1];
            const resumeTail = parse1?.[4]?.[0]?.[0];

            if (typeof text !== "string" || !Array.isArray(baseResume)) continue;

            const newResumeArray = [...baseResume, resumeTail];
            return {
                text: text.replace(/\*\*(.+?)\*\*/g, "*$1*"),
                resumeArray: newResumeArray,
            };
        } catch {
            // continue to next chunk candidate
        }
    }

    throw new Error("Unable to parse Gemini response body.");
}

async function gemini({ message, instruction = "", sessionId = null }) {
    try {
        if (!message) throw new Error("Message is required.");

        let resumeArray = null;
        let cookie = null;
        let savedInstruction = instruction;

        if (sessionId) {
            try {
                const sessionData = JSON.parse(Buffer.from(sessionId, "base64").toString());
                resumeArray = sessionData.resumeArray;
                cookie = sessionData.cookie;
                savedInstruction = instruction || sessionData.instruction || "";
            } catch {
                // ignore malformed session and continue with fresh one
            }
        }

        if (!cookie) {
            const { headers } = await axios.post(
                "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&bl=boq_assistant-bard-web-server_20250814.06_p1&f.sid=-7816331052118000090&hl=en-US&_reqid=173780&rt=c",
                "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
                {
                    headers: {
                        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
                    },
                }
            );

            cookie = headers["set-cookie"]?.[0]?.split("; ")[0] || "";
            if (!cookie) throw new Error("Failed to obtain Gemini cookie.");
        }

        const requestBody = [
            [message, 0, null, null, null, null, 0],
            ["en-US"],
            resumeArray || ["", "", "", null, null, null, null, null, null, ""],
            null,
            null,
            null,
            [1],
            1,
            null,
            null,
            1,
            0,
            null,
            null,
            null,
            null,
            null,
            [[0]],
            1,
            null,
            null,
            null,
            null,
            null,
            ["", "", savedInstruction, null, null, null, null, null, 0, null, 1, null, null, null, []],
            null,
            null,
            1,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
            1,
            null,
            null,
            null,
            null,
            [1],
        ];

        const payload = [null, JSON.stringify(requestBody)];

        const { data } = await axios.post(
            "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=boq_assistant-bard-web-server_20250729.06_p0&f.sid=4206607810970164620&hl=en-US&_reqid=2813378&rt=c",
            new URLSearchParams({ "f.req": JSON.stringify(payload) }).toString(),
            {
                headers: {
                    "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
                    "x-goog-ext-525001261-jspb": '[1,null,null,null,"9ec249fc9ad08861",null,null,null,[4]]',
                    cookie,
                },
            }
        );

        const parsed = parseGeminiText(data);

        const newSessionId = Buffer.from(
            JSON.stringify({
                resumeArray: parsed.resumeArray,
                cookie,
                instruction: savedInstruction,
            })
        ).toString("base64");

        return {
            text: parsed.text,
            sessionId: newSessionId,
        };
    } catch (error) {
        throw new Error(error?.message || "Gemini request failed");
    }
}

function resetSession(sessionId) {
    if (!sessionId) return 0;
    const id = String(sessionId);
    const existing = sessionState.get(id);
    sessionState.delete(id);
    scheduleSave();
    const turns = existing?.turns || 0;
    return turns * 2;
}

function getSessionLength(sessionId) {
    if (!sessionId) return 0;
    const id = String(sessionId);
    const existing = sessionState.get(id);
    return (existing?.turns || 0) * 2;
}

async function generateText(text, systemPrompt, sessionId) {
    try {
        const startedAt = Date.now();
        const eligible = isSessionEligible(sessionId);
        const id = String(sessionId || "");
        const state = eligible ? getSessionState(id) : { sessionId: null, turns: 0 };

        let response;
        try {
            response = await gemini({
                message: text,
                instruction: systemPrompt || "",
                sessionId: eligible ? state.sessionId : null,
            });
        } catch (firstError) {
            if (!eligible) throw firstError;
            // Retry once with a fresh session when stored session/cookie is stale.
            response = await gemini({
                message: text,
                instruction: systemPrompt || "",
                sessionId: null,
            });
        }

        if (eligible) {
            state.sessionId = response.sessionId || state.sessionId;
            state.turns = (Number(state.turns) || 0) + 1;
            sessionState.set(id, state);
            scheduleSave();
        }

        const responseTime = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

        return {
            result: response.text || "",
            responseTime,
            provider: "gemini.google.com",
            sessionId,
            conversationId: null,
            model: "gemini-web",
        };
    } catch (error) {
        console.error("AI API Error:", error?.message || error);
        throw error;
    }
}

async function checkToxic(text) {
    const systemPrompt =
        "You are a content moderation AI. Detect if this message is toxic or offensive. Answer only YES or NO.";
    try {
        const response = await generateText(text, systemPrompt, "system-moderation");
        const result = String(response.result || "").trim().toUpperCase();
        return result.includes("YES");
    } catch (error) {
        console.error("Moderation Check Error:", error);
        return false;
    }
}

async function summarizeChat(chatContent) {
    const systemPrompt =
        "Kamu adalah asisten yang membantu. Rangkum percakapan berikut dalam Bahasa Indonesia yang natural, ringkas, dan jelas. Formatkan dengan poin-poin penting, keputusan (jika ada), dan tindak lanjut (jika ada).";
    try {
        const response = await generateText(chatContent, systemPrompt, "system-summary");
        return response.result;
    } catch (error) {
        console.error("Summarization Error:", error);
        throw error;
    }
}

loadSessionsFromDisk();

module.exports = {
    generateText,
    checkToxic,
    summarizeChat,
    resetSession,
    getSessionLength,
    sessionsEnabled,
    buildSessionKey,
};
